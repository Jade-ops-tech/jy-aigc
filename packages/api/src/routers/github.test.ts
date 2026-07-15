import { createCipheriv, randomBytes } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const KEY_V1 = Buffer.alloc(32, 1);

const { client, testDb } = await vi.hoisted(async () => {
	process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
	process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret-32";
	process.env.BETTER_AUTH_URL = "http://localhost:3000";
	process.env.CORS_ORIGIN = "http://localhost:3001";
	process.env.GITHUB_TOKEN_ENCRYPTION_KEY = `v1:${Buffer.alloc(32, 1).toString(
		"base64"
	)},v2:${Buffer.alloc(32, 2).toString("base64")}`;
	const { PGlite } = await import("@electric-sql/pglite");
	const { drizzle } = await import("drizzle-orm/pglite");
	const pglite = new PGlite();
	return { client: pglite, testDb: drizzle(pglite) };
});

vi.mock("@jy-aigc/db", () => ({ db: testDb, createDb: () => testDb }));

const fetchGithubUserMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/github", () => ({
	fetchGithubUser: fetchGithubUserMock,
}));

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
const DEFAULT_PROFILE = {
	avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
	githubUserId: "1",
	login: "octocat",
	name: "The Octocat",
	profileUrl: "https://github.com/octocat",
};

type GithubCaller = ReturnType<typeof appRouter.createCaller>["github"];

function githubCallerFor(userId: string): GithubCaller {
	const ctx = {
		auth: null,
		session: { user: { id: userId } },
	} as unknown as Context;
	return appRouter.createCaller(ctx).github;
}

async function resetDatabase(): Promise<void> {
	await client.exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
	await client.exec(MIGRATION_SQL);
	await client.query(
		'INSERT INTO "user" (id, name, email) VALUES ($1, $2, $3), ($4, $5, $6)',
		[USER_A, USER_A, "a@test.dev", USER_B, USER_B, "b@test.dev"]
	);
	fetchGithubUserMock.mockReset();
	fetchGithubUserMock.mockResolvedValue(DEFAULT_PROFILE);
}

function encryptWithKeyV1(plaintext: string) {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", KEY_V1, iv);
	const ciphertext = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);

	return {
		tokenEncrypted: ciphertext.toString("base64"),
		tokenIv: iv.toString("base64"),
		tokenAuthTag: cipher.getAuthTag().toString("base64"),
		tokenKeyVersion: "v1",
	};
}

beforeEach(async () => {
	await resetDatabase();
});

describe("github.create + list", () => {
	it("stores an encrypted token and returns only the safe account view", async () => {
		const github = githubCallerFor(USER_A);

		const created = await github.create({
			label: "personal",
			token: "ghp_secret_token",
		});

		expect(created).toMatchObject({
			label: "personal",
			login: "octocat",
			name: "The Octocat",
			profileUrl: "https://github.com/octocat",
		});
		expect(created).not.toHaveProperty("tokenEncrypted");
		expect(created).not.toHaveProperty("token");

		const rows = await client.query<{
			token_auth_tag: string;
			token_encrypted: string;
			token_iv: string;
			token_key_version: string;
		}>("SELECT * FROM github_integration WHERE id = $1", [created.id]);
		expect(rows.rows).toHaveLength(1);
		expect(rows.rows[0]?.token_encrypted).not.toContain("ghp_secret_token");
		expect(rows.rows[0]?.token_iv).toBeTruthy();
		expect(rows.rows[0]?.token_auth_tag).toBeTruthy();
		expect(rows.rows[0]?.token_key_version).toBe("v2");

		const list = await github.list();
		expect(list).toHaveLength(1);
		expect(list[0]).not.toHaveProperty("tokenEncrypted");
		expect(list[0]).not.toHaveProperty("token");
	});

	it("allows one user to create and delete multiple token configs", async () => {
		const github = githubCallerFor(USER_A);
		const first = await github.create({ label: "one", token: "token-one" });
		const second = await github.create({ label: "two", token: "token-two" });

		expect(await github.list()).toHaveLength(2);

		await github.delete({ id: first.id });

		const list = await github.list();
		expect(list).toHaveLength(1);
		expect(list[0]?.id).toBe(second.id);
	});
});

describe("github.update", () => {
	it("updates label without returning or exposing the token", async () => {
		const github = githubCallerFor(USER_A);
		const created = await github.create({ label: "old", token: "token-one" });

		const updated = await github.update({ id: created.id, label: "new" });

		expect(updated.label).toBe("new");
		expect(updated.login).toBe("octocat");
		expect(fetchGithubUserMock).toHaveBeenCalledTimes(1);
	});

	it("validates a replacement token and refreshes account fields", async () => {
		const github = githubCallerFor(USER_A);
		const created = await github.create({ token: "token-one" });
		fetchGithubUserMock.mockResolvedValueOnce({
			...DEFAULT_PROFILE,
			githubUserId: "2",
			login: "hubot",
			name: null,
			profileUrl: "https://github.com/hubot",
		});

		const updated = await github.update({
			id: created.id,
			token: "token-two",
		});

		expect(updated.login).toBe("hubot");
		expect(updated.name).toBeNull();
		expect(fetchGithubUserMock).toHaveBeenCalledWith("token-two");
	});

	it("reencrypts old key versions on the next update path", async () => {
		const encrypted = encryptWithKeyV1("old-secret-token");
		await client.query(
			`INSERT INTO github_integration
				(id, user_id, label, token_encrypted, token_iv, token_auth_tag, token_key_version, github_user_id, login)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			[
				"legacy-id",
				USER_A,
				"legacy",
				encrypted.tokenEncrypted,
				encrypted.tokenIv,
				encrypted.tokenAuthTag,
				encrypted.tokenKeyVersion,
				"1",
				"octocat",
			]
		);

		await githubCallerFor(USER_A).update({ id: "legacy-id", label: "rotated" });

		const rows = await client.query<{ token_key_version: string }>(
			"SELECT token_key_version FROM github_integration WHERE id = $1",
			["legacy-id"]
		);
		expect(rows.rows[0]?.token_key_version).toBe("v2");
	});
});

describe("github errors and user isolation", () => {
	it("maps invalid tokens, forbidden responses, and network failures", async () => {
		const github = githubCallerFor(USER_A);

		fetchGithubUserMock.mockRejectedValueOnce(
			new TRPCError({
				code: "BAD_REQUEST",
				message: "GitHub token 无效，请检查后再试。",
			})
		);
		await expect(github.create({ token: "bad-token" })).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});

		fetchGithubUserMock.mockRejectedValueOnce(
			new TRPCError({
				code: "FORBIDDEN",
				message: "GitHub 拒绝了这次请求，请确认 token 权限或稍后再试。",
			})
		);
		await expect(
			github.create({ token: "forbidden-token" })
		).rejects.toMatchObject({ code: "FORBIDDEN" });

		fetchGithubUserMock.mockRejectedValueOnce(
			new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "连接 GitHub 时出现网络异常。",
			})
		);
		await expect(
			github.create({ token: "network-token" })
		).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	});

	it("does not list, update, or delete another user's config", async () => {
		const owner = githubCallerFor(USER_A);
		const created = await owner.create({ label: "owner", token: "token-one" });
		const other = githubCallerFor(USER_B);

		expect(await other.list()).toHaveLength(0);
		await expect(
			other.update({ id: created.id, label: "stolen" })
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(other.delete({ id: created.id })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});

		const ownerList = await owner.list();
		expect(ownerList).toHaveLength(1);
		expect(ownerList[0]?.label).toBe("owner");
	});
});
