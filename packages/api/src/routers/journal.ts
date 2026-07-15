import { db } from "@jy-aigc/db";
import { journalEntry } from "@jy-aigc/db/schema/journal";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { moodSchema } from "../moods";

export const journalRouter = router({
	create: protectedProcedure
		.input(
			z.object({
				body: z.string().trim().min(1),
				mood: moodSchema.optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const [created] = await db
				.insert(journalEntry)
				.values({
					id: crypto.randomUUID(),
					userId: ctx.session.user.id,
					body: input.body,
					mood: input.mood,
				})
				.returning();

			return created;
		}),

	list: protectedProcedure.query(({ ctx }) =>
		db
			.select()
			.from(journalEntry)
			.where(
				and(
					eq(journalEntry.userId, ctx.session.user.id),
					isNull(journalEntry.deletedAt)
				)
			)
			.orderBy(desc(journalEntry.createdAt))
	),

	update: protectedProcedure
		.input(
			z
				.object({
					id: z.string().min(1),
					body: z.string().trim().min(1).optional(),
					mood: moodSchema.nullable().optional(),
				})
				.refine((data) => data.body !== undefined || data.mood !== undefined, {
					message: "body 或 mood 至少提供一项",
				})
		)
		.mutation(async ({ ctx, input }) => {
			const updateValues: Partial<typeof journalEntry.$inferInsert> = {};

			if (input.body !== undefined) {
				updateValues.body = input.body;
			}
			if (input.mood !== undefined) {
				updateValues.mood = input.mood;
			}

			const [updated] = await db
				.update(journalEntry)
				.set(updateValues)
				.where(
					and(
						eq(journalEntry.id, input.id),
						eq(journalEntry.userId, ctx.session.user.id)
					)
				)
				.returning();

			if (!updated) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "记录不存在或无权限修改",
				});
			}

			return updated;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const [deleted] = await db
				.update(journalEntry)
				.set({ deletedAt: new Date() })
				.where(
					and(
						eq(journalEntry.id, input.id),
						eq(journalEntry.userId, ctx.session.user.id)
					)
				)
				.returning();

			if (!deleted) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "记录不存在或无权限删除",
				});
			}

			return { id: deleted.id };
		}),
});
