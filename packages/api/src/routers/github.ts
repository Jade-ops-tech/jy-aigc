import { db } from "@jy-aigc/db";
import { githubIntegration } from "@jy-aigc/db/schema/github";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { fetchGithubUser } from "../lib/github";
import {
	decryptToken,
	encryptToken,
	needsTokenReencryption,
} from "../lib/token-crypto";

const tokenInput = z.string().trim().min(1);
const labelInput = z.string().trim().min(1).max(80).nullable().optional();

type GithubIntegration = typeof githubIntegration.$inferSelect;

function safeGithubIntegration(row: GithubIntegration) {
	return {
		id: row.id,
		label: row.label,
		githubUserId: row.githubUserId,
		login: row.login,
		name: row.name,
		avatarUrl: row.avatarUrl,
		profileUrl: row.profileUrl,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function encryptedValues(token: string) {
	const encrypted = encryptToken(token);
	return {
		tokenEncrypted: encrypted.ciphertext,
		tokenIv: encrypted.iv,
		tokenAuthTag: encrypted.authTag,
		tokenKeyVersion: encrypted.keyVersion,
	};
}

export const githubRouter = router({
	create: protectedProcedure
		.input(
			z.object({
				label: labelInput,
				token: tokenInput,
			})
		)
		.mutation(async ({ ctx, input }) => {
			const profile = await fetchGithubUser(input.token);
			const [created] = await db
				.insert(githubIntegration)
				.values({
					id: crypto.randomUUID(),
					userId: ctx.session.user.id,
					label: input.label ?? null,
					...encryptedValues(input.token),
					...profile,
				})
				.returning();

			if (!created) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "GitHub token 配置保存失败",
				});
			}

			return safeGithubIntegration(created);
		}),

	list: protectedProcedure.query(async ({ ctx }) => {
		const rows = await db
			.select()
			.from(githubIntegration)
			.where(eq(githubIntegration.userId, ctx.session.user.id))
			.orderBy(desc(githubIntegration.createdAt));

		return rows.map(safeGithubIntegration);
	}),

	update: protectedProcedure
		.input(
			z
				.object({
					id: z.string().min(1),
					label: labelInput,
					token: tokenInput.optional(),
				})
				.refine(
					(data) => data.token !== undefined || data.label !== undefined,
					{
						message: "token 或 label 至少提供一项",
					}
				)
		)
		.mutation(async ({ ctx, input }) => {
			const [existing] = await db
				.select()
				.from(githubIntegration)
				.where(
					and(
						eq(githubIntegration.id, input.id),
						eq(githubIntegration.userId, ctx.session.user.id)
					)
				)
				.limit(1);

			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "GitHub token 配置不存在或无权限修改",
				});
			}

			const updateValues: Partial<typeof githubIntegration.$inferInsert> = {};

			if (input.label !== undefined) {
				updateValues.label = input.label;
			}

			if (input.token !== undefined) {
				const profile = await fetchGithubUser(input.token);
				Object.assign(updateValues, encryptedValues(input.token), profile);
			} else if (needsTokenReencryption(existing.tokenKeyVersion)) {
				const token = decryptToken({
					authTag: existing.tokenAuthTag,
					ciphertext: existing.tokenEncrypted,
					iv: existing.tokenIv,
					keyVersion: existing.tokenKeyVersion,
				});
				Object.assign(updateValues, encryptedValues(token));
			}

			const [updated] = await db
				.update(githubIntegration)
				.set(updateValues)
				.where(
					and(
						eq(githubIntegration.id, input.id),
						eq(githubIntegration.userId, ctx.session.user.id)
					)
				)
				.returning();

			if (!updated) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "GitHub token 配置不存在或无权限修改",
				});
			}

			return safeGithubIntegration(updated);
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const [deleted] = await db
				.delete(githubIntegration)
				.where(
					and(
						eq(githubIntegration.id, input.id),
						eq(githubIntegration.userId, ctx.session.user.id)
					)
				)
				.returning({ id: githubIntegration.id });

			if (!deleted) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "GitHub token 配置不存在或无权限删除",
				});
			}

			return deleted;
		}),
});
