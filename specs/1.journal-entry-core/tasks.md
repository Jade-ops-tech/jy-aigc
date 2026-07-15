# journal-entry-core — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-07-03 | v1   | 初始任务 |

## 项目信息

- 项目名: jy-aigc
- 架构类型: pnpm/Turborepo monorepo（Drizzle + tRPC）
- specs 路径: specs/1.journal-entry-core/

## 任务列表

### 功能 1: 数据模型

- [x] T-001: 新增 `packages/db/src/schema/journal.ts`（`journal_entry` 表 + userId 索引 + relations），在 `schema/index.ts` 追加导出，跑 `pnpm db:generate` 生成迁移 ~30min

### 功能 2: tRPC 记录能力

- [x] T-002: 新建 `packages/api/src/routers/journal.ts`，导出 `MOODS` 常量 + `journal.create`（protected，正文 trim≥1，mood 可选枚举，服务端赋 id/userId）~30min
- [x] T-003: 实现 `journal.list`（当前用户、`deletedAt IS NULL`、按 `createdAt` 倒序）~15min
- [x] T-004: 实现 `journal.update`（按 `id AND userId` 更新 body/mood，0 行抛 NOT_FOUND）~30min
- [x] T-005: 实现 `journal.delete`（软删除 `deletedAt`，按 `id AND userId`，0 行抛 NOT_FOUND），并在 `routers/index.ts` 挂载 `journal` ~15min

### 集成与测试

- [x] T-006: 集成测试：CRUD 全流程 + 空正文拒绝 + 非法 mood 拒绝 + 跨用户越权被拒 + 软删后不出现在列表 ~30min

## 依赖关系

- T-002 ~ T-005 依赖 T-001（表结构）
- T-005 挂载后 `journal` router 方可被前端调用
- 无跨 feature 上游依赖；本 feature 是 feature 2、3 的上游

## 风险点

- Neon serverless 连接需 `DATABASE_URL`，迁移前确认 env 就绪（复用现有 `packages/env`）。
- `updatedAt` 的 `$onUpdate` 仅在 Drizzle 更新时触发，软删除走 update 语句可同时刷新，符合预期。
