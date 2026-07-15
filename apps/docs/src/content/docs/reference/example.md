---
title: 架构与安全
description: Daily Musings 的代码边界、数据隔离和敏感信息处理规则。
---

## Monorepo

- `apps/web`：React、TanStack Router 和 TanStack Query 前端。
- `apps/server`：Hono HTTP 服务和 tRPC adapter。
- `packages/api`：tRPC router 与业务规则。
- `packages/db`：Drizzle schema 与 migrations。
- `packages/auth`：Better Auth 配置。
- `packages/env`：服务端和 Web 环境变量校验。
- `packages/ui`：共享 UI 组件与设计 token。

## 私密数据隔离

日记和 GitHub 集成的所有读取、更新和删除都必须同时按资源 ID 与当前 session 的 `user.id` 收窄。日记列表还必须过滤 `deletedAt IS NULL`。

## GitHub Token

- 明文 Token 只在请求处理期间短暂存在内存中。
- 数据库存储密文、12 字节随机 IV、GCM 认证标签和密钥版本。
- API 返回安全视图，不返回明文或加密字段。
- `GITHUB_TOKEN_ENCRYPTION_KEY` 只从服务端环境变量读取。
- 新密钥版本用于新写入；旧版本在后续更新或校验时惰性重加密。
