import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const githubIntegration = pgTable(
	"github_integration",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		label: text("label"),
		tokenEncrypted: text("token_encrypted").notNull(),
		tokenIv: text("token_iv").notNull(),
		tokenAuthTag: text("token_auth_tag").notNull(),
		tokenKeyVersion: text("token_key_version").notNull(),
		githubUserId: text("github_user_id"),
		login: text("login"),
		name: text("name"),
		avatarUrl: text("avatar_url"),
		profileUrl: text("profile_url"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("github_integration_userId_idx").on(table.userId)]
);

export const githubIntegrationRelations = relations(
	githubIntegration,
	({ one }) => ({
		user: one(user, {
			fields: [githubIntegration.userId],
			references: [user.id],
		}),
	})
);
