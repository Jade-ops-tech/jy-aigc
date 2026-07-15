# github-token-integration — 需求规格

## 概述

登录用户在表单页填写个人 GitHub token，系统用它调用 GitHub `GET /user` 校验有效性并展示基础资料。token 属敏感信息，服务端加密存储（AES-256-GCM + 环境变量主密钥 + 密钥版本），前端保存后不再明文回显。一个用户可绑定多个 token，支持增改删。

## 项目信息

- 项目名: jy-aigc
- 架构类型: pnpm/Turborepo monorepo（tRPC + Drizzle + better-auth + Node crypto + React 前端）

## 需求版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-07-03 | v1   | 初始需求 |

## 用户故事

- 作为登录用户，我想填入 GitHub token 并看到我的账户基础资料，以确认 token 有效。
- 作为登录用户，我想安全地保存多个 token 配置，并能新增/更新/删除它们。
- 作为登录用户，我希望我的 token 永不被明文回显或泄露。

## 功能需求

1. [F-001] 登录用户可在表单页填写个人 GitHub token（与当前用户绑定）。
2. [F-002] 保存时用 token 调用 GitHub `GET /user`，校验有效性并拉取基础资料（`githubUserId`/`login`/`name`/`avatarUrl`/`profileUrl`）。
3. [F-003] 一个用户可绑定多个 token；支持新增、更新、删除自己的 token 配置。
4. [F-004] 删除 token 配置时，同步删除/清空与该 token 关联的 GitHub 账户字段。
5. [F-005] 只读取账户基础信息，不请求仓库/组织/项目或写权限；推荐 fine-grained token（无需额外权限）或 classic token 最小 `read:user` scope。
6. [F-006] token 服务端加密存储：AES-256-GCM，主密钥取环境变量 `GITHUB_TOKEN_ENCRYPTION_KEY`（不入库、不进代码库）。
7. [F-007] DB 存密文、IV、认证标签、密钥版本，不存明文 token；前端保存后不得再次明文展示。
8. [F-008] 密钥轮换采用版本化：新写入用新版本；旧 token 在下次保存/校验/后台迁移时惰性重加密。
9. [F-009] 拉取 GitHub 信息失败时展示明确但克制的错误（token 无效 / 权限不足 / 网络异常）。

## 非功能需求

- 性能: `GET /user` 调用设合理超时；失败快速返回可读错误。
- 安全: 明文 token 只在内存中短暂存在；日志/错误信息不得含明文 token；加密密钥仅来自 env。
- 兼容性: 沿用 `protectedProcedure` 与 `packages/env` 的环境变量校验（zod）。

## 验收标准

- [ ] [AC-001] 保存有效 token 后返回并展示账户基础资料；无明文 token 回显。
- [ ] [AC-002] DB 中该行只有密文/IV/authTag/keyVersion，无明文 token。
- [ ] [AC-003] 同一用户可创建多条 token 配置并分别增改删。
- [ ] [AC-004] 删除配置后，关联 GitHub 账户字段被清空/随行删除。
- [ ] [AC-005] 无效 token / 权限不足 / 网络异常分别给出克制且明确的错误提示。
- [ ] [AC-006] 缺失或长度不合规的 `GITHUB_TOKEN_ENCRYPTION_KEY` 在启动/调用时被 env 校验拦截。
- [ ] [AC-007] 用旧密钥版本存的 token，在再次保存/校验后以新版本重新加密。

## 依赖

- better-auth session（现有）、`@jy-aigc/db`、`@jy-aigc/api`、`@jy-aigc/env`。
- GitHub REST API `GET https://api.github.com/user`。
- Node.js `crypto`（AES-256-GCM）。

## 开放问题

- 无。加密算法（AES-256-GCM）、密钥来源（env）、多 token、版本化轮换均由 PRD 第 13 节确认。
