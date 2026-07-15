import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

// Spin up an in-process PGlite Postgres before the module graph loads so the
// real tRPC router runs its actual SQL (per-user filtering, soft-delete,
// ordering) against genuine Postgres semantics — no Neon, no DATABASE_URL,
// no network. `vi.hoisted` guarantees this runs before the `vi.mock` factory
// and before the router imports `db` from `@jy-aigc/db`.
const { client, testDb } = await vi.hoisted(async () => {
	process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
	process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret-32";
	process.env.BETTER_AUTH_URL = "http://localhost:3000";
	process.env.CORS_ORIGIN = "http://localhost:3001";
	process.env.GITHUB_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString(
		"base64"
	);
	const { PGlite } = await import("@electric-sql/pglite");
	const { drizzle } = await import("drizzle-orm/pglite");
	const pglite = new PGlite();
	return { client: pglite, testDb: drizzle(pglite) };
});

vi.mock("@jy-aigc/db", () => ({ db: testDb, createDb: () => testDb }));

import type { Context } from "../context";
import { appRouter } from "./index";

const migrationsDir = join(
	dirname(fileURLToPath(import.meta.url)),
	"../../../db/src/migrations"
);
const MIGRATION_SQL = readdirSync(migrationsDir)
	.filter((fileName) => fileName.endsWith(".sql"))
	.sort()
	.map((fileName) => readFileSync(join(migrationsDir, fileName), "utf8"))
	.join("\n");

const USER_A = "user-a";
const USER_B = "user-b";
const SEED_USERS = [
	[USER_A, "a@test.dev"],
	[USER_B, "b@test.dev"],
] as const;

type JournalCaller = ReturnType<typeof appRouter.createCaller>["journal"];

function journalCallerFor(userId: string): JournalCaller {
	const ctx = {
		auth: null,
		session: { user: { id: userId } },
	} as unknown as Context;
	return appRouter.createCaller(ctx).journal;
}

async function resetDatabase(): Promise<void> {
	await client.exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
	await client.exec(MIGRATION_SQL);
	for (const [id, email] of SEED_USERS) {
		await client.query(
			'INSERT INTO "user" (id, name, email) VALUES ($1, $2, $3)',
			[id, id, email]
		);
	}
}

beforeEach(async () => {
	await resetDatabase();
});

describe("authentication (protectedProcedure)", () => {
	it("rejects unauthenticated access with UNAUTHORIZED", async () => {
		const ctx = { auth: null, session: null } as unknown as Context;
		const anonymous = appRouter.createCaller(ctx).journal;

		await expect(anonymous.list()).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
		await expect(anonymous.create({ body: "未登录" })).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
	});
});

describe("journal.create + list (CRUD happy path)", () => {
	it("creates an entry owned by the caller and returns it in the list", async () => {
		const journal = journalCallerFor(USER_A);

		const created = await journal.create({ body: "第一条想法", mood: "平静" });

		expect(created.id).toBeTruthy();
		expect(created.userId).toBe(USER_A);
		expect(created.body).toBe("第一条想法");
		expect(created.mood).toBe("平静");
		expect(created.deletedAt).toBeNull();

		const entries = await journal.list();
		expect(entries).toHaveLength(1);
		expect(entries[0]?.id).toBe(created.id);
	});

	it("allows an omitted mood (stored as null)", async () => {
		const journal = journalCallerFor(USER_A);
		const created = await journal.create({ body: "无情绪" });
		expect(created.mood).toBeNull();
	});

	it("accepts every mood in the fixed enum", async () => {
		const journal = journalCallerFor(USER_A);
		for (const mood of ["平静", "柔软", "焦躁", "感恩", "沉重", "期待"]) {
			const created = await journal.create({
				body: `mood-${mood}`,
				mood: mood as "平静",
			});
			expect(created.mood).toBe(mood);
		}
	});

	it("returns entries newest-first by createdAt", async () => {
		const journal = journalCallerFor(USER_A);
		const first = await journal.create({ body: "oldest" });
		const second = await journal.create({ body: "middle" });
		const third = await journal.create({ body: "newest" });

		// Pin distinct createdAt values so ordering is deterministic.
		await client.query(
			"UPDATE journal_entry SET created_at = $1 WHERE id = $2",
			[new Date("2026-01-01T00:00:00Z"), first.id]
		);
		await client.query(
			"UPDATE journal_entry SET created_at = $1 WHERE id = $2",
			[new Date("2026-02-01T00:00:00Z"), second.id]
		);
		await client.query(
			"UPDATE journal_entry SET created_at = $1 WHERE id = $2",
			[new Date("2026-03-01T00:00:00Z"), third.id]
		);

		const ids = (await journal.list()).map((entry) => entry.id);
		expect(ids).toEqual([third.id, second.id, first.id]);
	});
});

describe("journal.update", () => {
	it("updates body and mood and refreshes updatedAt for the owner", async () => {
		const journal = journalCallerFor(USER_A);
		const created = await journal.create({ body: "原文", mood: "平静" });

		const updated = await journal.update({
			id: created.id,
			body: "改后",
			mood: "感恩",
		});

		expect(updated.body).toBe("改后");
		expect(updated.mood).toBe("感恩");
		expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
			created.updatedAt.getTime()
		);
	});

	it("clears mood when explicitly set to null", async () => {
		const journal = journalCallerFor(USER_A);
		const created = await journal.create({ body: "有情绪", mood: "沉重" });
		const updated = await journal.update({ id: created.id, mood: null });
		expect(updated.mood).toBeNull();
		expect(updated.body).toBe("有情绪");
	});
});

describe("journal.delete (soft delete)", () => {
	it("removes the entry from the list but keeps the row with deletedAt set", async () => {
		const journal = journalCallerFor(USER_A);
		const created = await journal.create({ body: "待删除" });

		const result = await journal.delete({ id: created.id });
		expect(result).toEqual({ id: created.id });

		const entries = await journal.list();
		expect(entries).toHaveLength(0);

		const rows = await client.query<{ deleted_at: Date | null }>(
			"SELECT deleted_at FROM journal_entry WHERE id = $1",
			[created.id]
		);
		expect(rows.rows).toHaveLength(1);
		expect(rows.rows[0]?.deleted_at).not.toBeNull();
	});
});

describe("input validation", () => {
	it("rejects an empty (whitespace-only) body with BAD_REQUEST", async () => {
		const journal = journalCallerFor(USER_A);
		await expect(journal.create({ body: "   " })).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
		const entries = await journal.list();
		expect(entries).toHaveLength(0);
	});

	it("rejects a mood value outside the fixed enum with BAD_REQUEST", async () => {
		const journal = journalCallerFor(USER_A);
		await expect(
			journal.create({ body: "有效正文", mood: "开心" as "平静" })
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		const entries = await journal.list();
		expect(entries).toHaveLength(0);
	});
});

describe("cross-user isolation (IDOR protection)", () => {
	it("does not leak another user's entries in the list", async () => {
		await journalCallerFor(USER_A).create({ body: "A 的记录" });
		const bEntries = await journalCallerFor(USER_B).list();
		expect(bEntries).toHaveLength(0);
	});

	it("rejects updating another user's entry with NOT_FOUND and leaves it intact", async () => {
		const owner = journalCallerFor(USER_A);
		const created = await owner.create({ body: "只属于 A", mood: "平静" });

		await expect(
			journalCallerFor(USER_B).update({ id: created.id, body: "越权改" })
		).rejects.toMatchObject({ code: "NOT_FOUND" });

		const [entry] = await owner.list();
		expect(entry?.body).toBe("只属于 A");
		expect(entry?.mood).toBe("平静");
	});

	it("rejects deleting another user's entry with NOT_FOUND and leaves it visible", async () => {
		const owner = journalCallerFor(USER_A);
		const created = await owner.create({ body: "别删我" });

		await expect(
			journalCallerFor(USER_B).delete({ id: created.id })
		).rejects.toMatchObject({ code: "NOT_FOUND" });

		const entries = await owner.list();
		expect(entries).toHaveLength(1);
		expect(entries[0]?.id).toBe(created.id);
	});
});
