import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const journalEntry = pgTable(
	"journal_entry",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		body: text("body").notNull(),
		mood: text("mood"), // 固定枚举值之一，可空；枚举合法性由 API 层 zod 校验
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
		deletedAt: timestamp("deleted_at"), // 软删除标记，非空即已删除
	},
	(table) => [index("journal_entry_userId_idx").on(table.userId)]
);

export const journalEntryRelations = relations(journalEntry, ({ one }) => ({
	user: one(user, {
		fields: [journalEntry.userId],
		references: [user.id],
	}),
}));
