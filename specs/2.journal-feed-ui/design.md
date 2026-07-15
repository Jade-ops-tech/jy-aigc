# journal-feed-ui — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-07-03 | v1   | 初始设计 |

## 项目架构

- 架构类型: pnpm/Turborepo monorepo
- 涉及层: 前端（`apps/web` 路由 + 组件、`packages/ui` 共享组件、Tailwind v4 主题）
- 复用规范: TanStack Router 文件式路由（见 `apps/web/src/routes`）、`_auth` 保护布局（`routes/_auth/route.tsx`）、tRPC + TanStack Query（`apps/web/src/utils/trpc.ts`）、Biome/Ultracite（React 函数组件、语义化 + a11y）。
- Stitch: 首页设计稿见 requirements 依赖；开发前连 Stitch MCP 拉取截图/尺寸，PRD 内联 token 为兜底。

## 功能模块设计

### 模块 1: 设计系统（Emotional Sanctuary）

**涉及层及关键设计（Tailwind 主题 + 字体）:**

- 在 `packages/ui/src/styles/globals.css`（Tailwind v4 `@theme`）定义语义色 token：`--color-background: #fff8f5`、`--color-surface`/`--color-surface-low`/`--color-surface-high`、`--color-primary: #7d562d`、`--color-primary-container: #d4a373`、`--color-ink: #1f1b17`、`--color-ink-muted: #50453b`、`--color-outline: #d4c4b7`。
- 字体：self-host **Be Vietnam Pro**（UI）与 **Literata**（日记正文）为 `@font-face`，映射到 `--font-ui` / `--font-serif`；`font-display: swap`。
- 排版 token：记录展示 Literata 24/36；正文 Literata 18/30；UI 正文 Be Vietnam Pro 16/24；标签 Be Vietnam Pro 12/16（小标题/大写）。
- 布局工具类：`.reading-column { max-width: 680px; margin-inline: auto; }`，移动端容器左右 `padding: 20px`。

### 模块 2: 首页信息流路由

**涉及层及关键设计（前端路由）:**

- 新增 `apps/web/src/routes/_auth/index.tsx`（或将首页并入 `_auth`），复用现有 `_auth/route.tsx` 的登录保护；未登录由该布局重定向。
- 页面结构：产品身份标题（Literata）+「New Entry」胶囊按钮（`Link` 到记录页 `feature 3`）+ 时间线列表。
- 用 `useQuery(trpc.journal.list...)` 拉取数据，处理 `isLoading` / `isError`（温和 loader，复用 `components/loader.tsx`）。

### 模块 3: 日记卡片 + 时间线分组

**涉及层及关键设计（组件）:**

- `EntryCard`：padding ≥24px、`rounded-[20px]`、柔和暖色 `box-shadow`；正文 Literata；底部元数据行用紧凑标签（日期/时间/mood）。mood 以「小圆点 + 文本」呈现，不单靠颜色。
- `DayGroup`：把 `journal.list` 结果按 `createdAt` 的本地日期 `groupBy` 分组；组头是紧凑日期 tag；同组卡片左侧用一条 1px `--color-outline` 竖线串联；组间较大 `gap`。
- `EmptyState`：无记录时渲染，充足留白 + 邀请书写文案 + 指向记录页的入口。

## 接口契约

- 消费 feature 1 的 `journal.list`（query，无入参，返回倒序 `JournalEntry[]`）。本 feature 不新增服务端接口。

## 数据模型

- 复用 `JournalEntry`（feature 1）。前端按 `createdAt` 分组的派生结构 `{ dateLabel, entries[] }` 仅存在于组件层。

## 安全考虑

- 页面置于 `_auth` 保护路由，未登录重定向登录（复用现有机制）。
- 仅渲染服务端按 userId 过滤后的数据，前端不做额外权限判断。

## 技术决策

| 决策         | 选项                                   | 理由                                             |
| ------------ | -------------------------------------- | ------------------------------------------------ |
| 主题落点     | `packages/ui` globals.css（选中）      | 两个 UI feature 与共享组件统一取色，避免重复定义 |
| 字体引入     | self-host `@font-face`（选中）vs CDN   | 隐私工具避免第三方字体请求、消除 FOUT，符合安静基调 |
| 分组计算     | 前端按本地日期分组（选中）             | 列表数据量小，服务端已倒序，前端分组最简单        |
| 首页路由归属 | `_auth/index.tsx`（选中）              | 复用现有登录保护布局，无需重复鉴权逻辑            |
