# github-token-integration — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-07-03 | v1   | 初始设计 |

## 项目架构

- 架构类型: pnpm/Turborepo monorepo
- 涉及层: 数据库（`packages/db`）、加密/集成服务（`packages/api` 或 `packages/auth` 内新模块）、API（tRPC router）、环境变量（`packages/env`）、前端（`apps/web` 表单页）
- 复用规范: `protectedProcedure`（`packages/api/src/index.ts`）、Drizzle schema 风格、`packages/env` 的 zod env 校验、Ultracite 安全准则（禁硬编码密钥、`Error` 抛错、输入校验）。

## 功能模块设计

### 模块 1: 数据模型（github_integration）

**涉及层及关键设计（数据库）:**

`packages/db/src/schema/github.ts`，`schema/index.ts` 追加导出。

```ts
export const githubIntegration = pgTable(
  "github_integration",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    label: text("label"),
    tokenEncrypted: text("token_encrypted").notNull(), // base64 密文
    tokenIv: text("token_iv").notNull(),               // base64 IV(12B)
    tokenAuthTag: text("token_auth_tag").notNull(),     // base64 GCM authTag
    tokenKeyVersion: text("token_key_version").notNull(),
    githubUserId: text("github_user_id"),
    login: text("login"),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    profileUrl: text("profile_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => [index("github_integration_userId_idx").on(t.userId)],
);
```

- 账户字段（`githubUserId`…`profileUrl`）随行存储；删除行即随之消失（对应 F-004）。

### 模块 2: 加密服务（AES-256-GCM + 密钥版本化）

**涉及层及关键设计（服务）:**

`packages/api/src/lib/token-crypto.ts`（或 `packages/auth`）。

- 主密钥来源：`env.GITHUB_TOKEN_ENCRYPTION_KEY`。设计为「版本 → 密钥」映射，支持轮换：例如 env 存 `v1:<base64-32B>[,v2:<...>]`，或单值默认 `v1`。`packages/env/server` 用 zod 校验存在且解析后每个密钥为 32 字节。
- `encrypt(plaintext) → { ciphertext, iv, authTag, keyVersion }`：随机 12B IV，`createCipheriv("aes-256-gcm", key, iv)`，输出 base64；`keyVersion` = 当前最新版本。
- `decrypt({ ciphertext, iv, authTag, keyVersion }) → plaintext`：按 `keyVersion` 取密钥；`createDecipheriv` + `setAuthTag`。
- 惰性重加密：读到某行 `tokenKeyVersion` 落后于最新版本时，在保存/校验路径用最新版本重新 `encrypt` 并回写（F-008）。

### 模块 3: GitHub API client

**涉及层及关键设计（集成）:**

`packages/api/src/lib/github.ts`：`fetchGithubUser(token) → { id, login, name, avatar_url, html_url }`。

- `GET https://api.github.com/user`，头 `Authorization: Bearer <token>`、`Accept: application/vnd.github+json`、`X-GitHub-Api-Version`、`User-Agent`。
- 设超时（AbortSignal）。按响应码映射错误：401 → token 无效；403 → 权限/限流不足；网络异常 → 网络错误。抛 `TRPCError`（BAD_REQUEST/UNAUTHORIZED）携带克制文案（F-009），**日志与错误信息绝不含明文 token**。

### 模块 4: tRPC githubRouter

**涉及层及关键设计（API）:**

`packages/api/src/routers/github.ts`，挂载 `github` 到 `routers/index.ts`。全部 `protectedProcedure`、按 `userId` 收窄。

```
create({ token, label? }): 校验 token→fetchGithubUser→encrypt→insert(含账户字段)；返回不含 token 的安全视图
list():                    当前用户所有配置（仅安全字段：id/label/login/name/avatarUrl/profileUrl/createdAt），绝不返回密文/明文
update({ id, token?, label? }): 有 token 则重新校验+加密+刷新账户字段；否则仅改 label；按 id AND userId
delete({ id }):            按 id AND userId 删除整行（账户字段随行删除）
```

- 返回类型统一走「安全视图」映射函数，从源头杜绝密文/明文外泄。

### 模块 5: 前端表单页

**涉及层及关键设计（前端）:**

`apps/web/src/routes/_auth/github.tsx`（登录保护）。

- 表单：token 输入（`type="password"`，`autocomplete="off"`）+ 可选 label；提交走 `github.create`/`update`。
- 已保存配置列表：展示 login/name/头像等基础资料 + 增改删操作；**保存后不再回显明文 token**（仅显示占位如「已保存 ••••」）。
- 错误态：展示后端返回的克制文案（无效/权限不足/网络异常）。推荐 fine-grained token 的说明性文案。

## 接口契约

| 过程            | 类型     | 输入                              | 输出（安全视图）                  |
| --------------- | -------- | --------------------------------- | --------------------------------- |
| `github.create` | mutation | `{ token: string, label?: string }` | 配置（无 token）+ 账户资料      |
| `github.list`   | query    | –                                 | 配置[]（无 token/密文）           |
| `github.update` | mutation | `{ id, token?, label? }`          | 更新后的配置（无 token）          |
| `github.delete` | mutation | `{ id }`                          | `{ id }`                          |

## 数据模型

见模块 1；DB 只存密文/IV/authTag/keyVersion + 账户字段，永不存明文 token。

## 安全考虑

- 明文 token 仅在请求处理内存中短暂存在，不落库、不写日志、不回前端。
- 加密密钥仅来自 `GITHUB_TOKEN_ENCRYPTION_KEY`（`.env`，已被 `.gitignore` 忽略），代码库零硬编码。
- AES-256-GCM 提供机密性 + 完整性（authTag 校验防篡改）。
- 所有过程 `protectedProcedure` + `userId` 收窄，防越权访问他人 token 配置。
- token 输入框 `type="password"` + 禁用自动填充；错误提示不暴露 token 片段。

## 技术决策

| 决策           | 选项                                          | 理由                                       |
| -------------- | --------------------------------------------- | ------------------------------------------ |
| 加密算法       | AES-256-GCM（PRD 指定）                        | 对称加密 + 完整性校验，Node crypto 原生支持 |
| 密钥管理       | env `GITHUB_TOKEN_ENCRYPTION_KEY` 版本化（选中）| 满足 PRD 轮换要求，密钥不入库              |
| 重加密时机     | 惰性（保存/校验/迁移时）（选中）              | 无需一次性全量迁移，符合 PRD 描述          |
| 账户字段存储   | 随集成行存储（选中）                          | 删除行即清空关联字段（F-004），实现最简    |
| 返回体         | 安全视图映射（选中）                          | 从类型层杜绝密文/明文外泄                  |
| 推荐 token 类型 | fine-grained（无额外权限）/ classic `read:user`| 遵循最小权限，PRD 明确                     |
