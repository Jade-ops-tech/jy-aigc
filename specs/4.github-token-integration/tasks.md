# github-token-integration — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-07-03 | v1   | 初始任务 |

## 项目信息

- 项目名: jy-aigc
- 架构类型: pnpm/Turborepo monorepo（tRPC + Drizzle + Node crypto + React）
- specs 路径: specs/4.github-token-integration/

## 任务列表

### 功能 1: 数据模型与环境

- [x] T-001: 新增 `packages/db/src/schema/github.ts`（`github_integration` 表：密文/IV/authTag/keyVersion + 账户字段 + userId 索引），追加导出，`pnpm db:generate` 迁移 ~30min
- [x] T-002: 在 `packages/env/server` 用 zod 增加 `GITHUB_TOKEN_ENCRYPTION_KEY`（校验存在 + 解析出 32B 密钥/版本映射）~15min

### 功能 2: 加密与集成服务

- [x] T-003: `token-crypto.ts`：AES-256-GCM `encrypt`/`decrypt`（随机 12B IV、authTag、按 keyVersion 取密钥）+ 惰性重加密辅助 ~30min
- [x] T-004: `github.ts` client：`GET /user` 拉取基础资料，超时控制 + 401/403/网络错误映射为克制文案（日志不含明文 token）~30min

### 功能 3: tRPC 能力

- [x] T-005: `githubRouter.create`/`update`（校验 token→加密→存/刷新账户字段，含惰性重加密）+ 安全视图映射（绝不返回密文/明文）~30min
- [x] T-006: `githubRouter.list`/`delete`（按 userId 收窄，删除整行随带账户字段）+ 挂载 `github` 到 routers/index ~15min

### 功能 4: 前端 + 测试

- [x] T-007: 前端 `apps/web/src/routes/_auth/github.tsx` 表单页（password 输入、增改删、已保存资料展示、保存后不回显明文、克制错误提示）~30min
- [x] T-008: 集成测试：加密往返 + 无效/权限不足/网络异常错误 + 多 token 增改删 + 越权被拒 + keyVersion 惰性重加密 ~30min

## 依赖关系

- T-003 依赖 T-002（密钥）；T-005 依赖 T-001/T-003/T-004；T-006 依赖 T-001
- T-007 依赖 T-005/T-006（接口就绪）
- 无跨 feature 依赖 —— 本 feature 可与 feature 1/2/3 全程并行

## 风险点

- GitHub API 限流/网络波动需超时与重试策略（首版至少超时 + 明确错误）。
- 密钥格式（单值 vs `v1:..,v2:..` 版本映射）需在 T-002/T-003 统一约定，并写入 `.env.example`。
- 确保明文 token 不进入任何日志/错误堆栈/前端返回体（测试用例专门覆盖）。
