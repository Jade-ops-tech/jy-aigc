---
title: 本地开发
description: 安装依赖、配置环境变量并运行 Daily Musings。
---

## 环境要求

- Node.js 22+
- pnpm 11+
- 一个可连接的 PostgreSQL/Neon 数据库

## 环境变量

服务端变量放在 `apps/server/.env`：

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CORS_ORIGIN`
- `GITHUB_TOKEN_ENCRYPTION_KEY`

Web 端变量放在 `apps/web/.env`：

- `VITE_SERVER_URL`

部署文档站时设置 `SITE_URL` 为文档站公开地址；本地构建默认使用 `http://localhost:4321`。

密钥和数据库连接串不得提交到 Git。

## 常用命令

```bash
pnpm install
pnpm dev
pnpm build
pnpm check-types
pnpm test
```

Web 默认运行在 `http://localhost:3001`，API 默认运行在 `http://localhost:3000`。

## 数据库迁移

```bash
pnpm db:generate
pnpm db:migrate
```

第一份 migration 是全量基线。对已经使用 `db:push` 建过表的数据库，必须先确认 `drizzle.__drizzle_migrations` 与实际表结构一致，不能直接重复执行基线 SQL。
