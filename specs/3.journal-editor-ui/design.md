# journal-editor-ui — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-07-03 | v1   | 初始设计 |

## 项目架构

- 架构类型: pnpm/Turborepo monorepo
- 涉及层: 前端（`apps/web` 路由 + 组件、`packages/ui` 控件、feature 2 设计系统）
- 复用规范: TanStack Router、tRPC mutation + TanStack Query 失效刷新、`@jy-aigc/api` 导出的 `MOODS`、Ultracite（受控组件、a11y label、语义化）。
- Stitch: 记录页设计稿见 requirements 依赖；开发前连 Stitch MCP，PRD token 兜底。

## 功能模块设计

### 模块 1: 记录页路由与输入区

**涉及层及关键设计（前端路由）:**

- 新增 `apps/web/src/routes/_auth/entry.$entryId.tsx` 或 `entry.new.tsx` —— 采用单路由 `_auth/entry.tsx` + search param `?id=` 区分新建/编辑，或两条路由；推荐 `entry.new.tsx`（新建，带草稿）与 `entry.$id.tsx`（编辑，预填）。
- 正文 `<textarea>`（Literata、自动增高、无厚边框、底边框/浅填充、聚焦态温暖），配可访问 `<label>`（可 sr-only 但必须存在）。
- 系统控件区（保存/取消）视觉弱化：次要按钮样式、置于输入区下方或顶栏轻量位置。

### 模块 2: 心情选择器

**涉及层及关键设计（组件）:**

- `MoodPicker`：从 `@jy-aigc/api` 引入 `MOODS` 渲染 6 个可切换 chip；单选、可取消；每个 chip = 柔和底色 + **文本标签**（不单靠颜色）；`role`/`aria-pressed` 表达选中态，键盘可达。

### 模块 3: 保存/取消/删除 + 数据流

**涉及层及关键设计（前端数据流）:**

- 保存：`journal.create`（新建）或 `journal.update`（编辑）mutation；成功后 `invalidate` `journal.list` 并 `navigate` 回首页；正文 trim 为空则禁用保存并温和提示。
- 取消：直接返回首页（有未保存改动时可温和确认，非强制）。
- 删除（仅编辑态）：二次确认对话框（复用 `packages/ui` 的 dialog/alert）→ `journal.delete` → 返回首页。

### 模块 4: 草稿保留

**涉及层及关键设计（本地存储）:**

- 仅新建场景：`useDraft` hook 把正文/mood 节流写入 `localStorage`（key 如 `daily-musings:draft`）。
- 进入新建页时若存在草稿则恢复；保存成功或用户显式取消后清除草稿。
- 编辑已有记录不写草稿，避免覆盖服务端内容。

## 接口契约

- 消费 feature 1：`journal.create` / `journal.update` / `journal.delete`。本 feature 不新增服务端接口。

## 数据模型

- 复用 `JournalEntry` 与 `Mood`（feature 1）。草稿本地结构 `{ body: string, mood?: Mood }` 存于 localStorage。

## 安全考虑

- 所有写操作走 `protectedProcedure`，服务端按 userId 校验所有权（feature 1 已保证），前端不信任本地 id。
- localStorage 草稿仅存正文/mood，属用户本机私密数据；登出时可一并清除（可选增强）。

## 技术决策

| 决策         | 选项                                      | 理由                                             |
| ------------ | ----------------------------------------- | ------------------------------------------------ |
| 新建/编辑路由 | 分离 `entry.new` / `entry.$id`（选中）    | 语义清晰；编辑预填、新建带草稿，逻辑不互相污染    |
| 草稿存储     | localStorage 单条（选中）vs 后端草稿      | 满足「意外离开保留」且零后端成本；多草稿非首版目标 |
| 心情单选     | 可切换/可取消 chip（选中）                | 对应 PRD「可选、固定、不评判」                    |
| 删除确认     | 二次确认对话框（选中）                    | PRD 要求确认后删除，避免误删                      |
