# journal-entry-core — 需求规格

## 概述

日记记录的数据模型与服务端能力：登录用户对自己的碎碎念进行创建、倒序浏览、编辑与删除，数据私密且与用户绑定。

## 项目信息

- 项目名: jy-aigc
- 架构类型: pnpm/Turborepo monorepo（Better-T-Stack：Hono + tRPC + better-auth + Drizzle + Neon Postgres）

## 需求版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-07-03 | v1   | 初始需求 |

## 用户故事

- 作为登录用户，我想快速写下一条想法并保存，以便在灵感消失前捕捉它。
- 作为登录用户，我想按倒序浏览自己的记录，以便平静地回看过去。
- 作为登录用户，我想编辑或删除某条记录，以便修正或移除内容。
- 作为登录用户，我希望我的记录只有自己可见，以便获得隐私安全感。

## 功能需求

1. [F-001] 记录数据模型 `journal_entry`：`id`、`userId`、`body`、`mood?`、`createdAt`、`updatedAt`、`deletedAt?`。
2. [F-002] 创建记录：保存正文、创建时间、可选 mood；正文为空（trim 后）不可保存。
3. [F-003] 列表记录：仅返回当前登录用户、未软删除的记录，按 `createdAt` 倒序。
4. [F-004] 编辑记录：仅记录所有者可更新其 `body` / `mood`，同步刷新 `updatedAt`。
5. [F-005] 删除记录：软删除（写入 `deletedAt`），删除后不再出现在列表。
6. [F-006] mood 为固定枚举：平静、柔软、焦躁、感恩、沉重、期待；不接受枚举外的值。
7. [F-007] 所有过程均为受保护过程（需登录）；跨用户访问他人记录必须被拒绝。

## 非功能需求

- 性能: 列表查询按 `userId` 建索引，避免全表扫描。
- 安全: 记录读写强制按 `ctx.session.user.id` 过滤，杜绝越权。
- 兼容性: 沿用现有 Drizzle schema 风格与 tRPC `protectedProcedure`。

## 验收标准

- [ ] [AC-001] `journal_entry` 表迁移可通过 `pnpm db:push` / `db:generate` 生成并应用。
- [ ] [AC-002] 空正文创建返回校验错误，不落库。
- [ ] [AC-003] 列表只含当前用户未删除记录，且按创建时间倒序。
- [ ] [AC-004] 非所有者更新/删除他人记录返回 UNAUTHORIZED / NOT_FOUND，不生效。
- [ ] [AC-005] 软删除后记录从列表消失，但行仍在库中（`deletedAt` 非空）。
- [ ] [AC-006] 传入非法 mood 值被 zod 拒绝。

## 依赖

- `@jy-aigc/db`（Drizzle + Neon）、`@jy-aigc/api`（tRPC `protectedProcedure`）、better-auth session。

## 开放问题

- 无（编辑/删除的 UI 入口在 feature 3 定义）。
