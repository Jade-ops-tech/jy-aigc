# journal-entry-core — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-07-03 | v1   | 初始设计 |

## 项目架构

- 架构类型: pnpm/Turborepo monorepo
- 涉及层: 数据库（`packages/db`）、API（`packages/api` tRPC router）
- 复用规范: 沿用现有 `packages/db/src/schema/*.ts` 的 `pgTable` 风格、`packages/api` 的 `protectedProcedure`（见 `packages/api/src/index.ts`）、Biome tab 缩进 + 双引号（`.claude/CLAUDE.md` Ultracite 标准）。

## 功能模块设计

### 模块 1: 数据模型（journal_entry）

**涉及层及关键设计（数据库）:**

在 `packages/db/src/schema/journal.ts` 新增表，并在 `schema/index.ts` 追加 `export * from "./journal"`。

```ts
import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const journalEntry = pgTable(
  "journal_entry",
  {
    id: text("id").primaryKey(), // crypto.randomUUID()
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    mood: text("mood"), // 固定枚举值之一，可空；枚举在 API 层校验
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"), // 软删除
  },
  (table) => [index("journal_entry_userId_idx").on(table.userId)],
);

export const journalEntryRelations = relations(journalEntry, ({ one }) => ({
  user: one(user, { fields: [journalEntry.userId], references: [user.id] }),
}));
```

- mood 存 `text`（而非 pg enum），避免后续调整枚举需 DB 迁移；合法性由 API 层 zod 枚举保证。
- 软删除用 `deletedAt` 而非物理删除，契合 PRD 数据模型中的 `deletedAt?` 字段。

### 模块 2: tRPC journalRouter

**涉及层及关键设计（API）:**

新增 `packages/api/src/routers/journal.ts`，在 `routers/index.ts` 挂载 `journal: journalRouter`。全部使用 `protectedProcedure`，统一以 `ctx.session.user.id` 过滤。

```ts
export const MOODS = ["平静", "柔软", "焦躁", "感恩", "沉重", "期待"] as const;
const moodSchema = z.enum(MOODS);

// create: input { body: z.string().trim().min(1), mood: moodSchema.optional() }
//   → insert，id = crypto.randomUUID()，userId = ctx.session.user.id
// list:   query → select where userId = me AND deletedAt IS NULL, orderBy desc(createdAt)
// update: input { id, body?: trim().min(1), mood?: moodSchema.nullable() }
//   → update ... where id = input.id AND userId = me；受影响 0 行则 throw NOT_FOUND
// delete: input { id } → set deletedAt = new Date() where id AND userId = me；0 行 → NOT_FOUND
```

- `MOODS` 常量从 `@jy-aigc/api` 导出，供前端 feature 3 的 mood 选择器复用，保证前后端枚举单一事实源。
- 更新/删除都带 `AND userId = me` 条件，越权时受影响行数为 0，据此抛 `NOT_FOUND`（不泄露他人记录存在性）。

## 接口契约

| 过程            | 类型     | 输入                                            | 输出                        |
| --------------- | -------- | ----------------------------------------------- | --------------------------- |
| `journal.create`| mutation | `{ body: string(≥1 trim), mood?: Mood }`        | 新建记录                    |
| `journal.list`  | query    | –                                               | `JournalEntry[]`（倒序）    |
| `journal.update`| mutation | `{ id: string, body?: string, mood?: Mood\|null }` | 更新后的记录             |
| `journal.delete`| mutation | `{ id: string }`                                | `{ id }`                    |

## 数据模型

见模块 1。`Mood = (typeof MOODS)[number]`。

## 安全考虑

- 全部过程走 `protectedProcedure`，未登录返回 `UNAUTHORIZED`。
- 每条 SQL 都以 `userId = ctx.session.user.id` 收窄，杜绝 IDOR 越权访问。
- 不接受客户端传入的 `userId` / `createdAt`，由服务端赋值。

## 技术决策

| 决策           | 选项                          | 理由                                             |
| -------------- | ----------------------------- | ------------------------------------------------ |
| 删除方式       | 软删除 `deletedAt`（选中）    | 契合 PRD 数据模型；保留数据、降低误删风险         |
| mood 存储      | `text` + API 层 zod 枚举（选中）| 调整情绪选项无需 DB 迁移                          |
| 主键           | `text` UUID（选中）vs serial  | 与 auth 表主键风格一致，避免自增 ID 暴露记录数量  |
| 枚举事实源     | `MOODS` 从 API 导出（选中）   | 前后端共用一份，避免漂移                          |
