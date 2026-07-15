# journal-feed-ui — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-07-03 | v1   | 初始任务 |

## 项目信息

- 项目名: jy-aigc
- 架构类型: pnpm/Turborepo monorepo（React + Vite + TanStack Router + tRPC）
- specs 路径: specs/2.journal-feed-ui/

## 任务列表

### 功能 1: 设计系统

- [x] T-001: 在 `packages/ui/src/styles/globals.css` 定义暖色语义 token（背景/表面/主色/文字/轮廓）+ self-host Literata & Be Vietnam Pro `@font-face` + 排版/680px 布局工具类 ~30min

### 功能 2: 首页信息流

- [x] T-002: 新增 `apps/web/src/routes/_auth/index.tsx`（登录保护），产品身份标题 + 「New Entry」胶囊按钮入口 + 页面骨架 ~30min
- [x] T-003: `EntryCard` 组件（≥24px 内边距、16–24px 圆角、暖色柔和阴影、Literata 正文、紧凑元数据标签，mood = 圆点+文本）~30min
- [x] T-004: `DayGroup` 按天分组 + 紧凑日期 tag + 细时间线竖线 + 组间大垂直间距 ~30min
- [x] T-005: `EmptyState` 温和空状态（充足留白、邀请文案、指向记录页入口）~15min

### 集成与测试

- [x] T-006: 接 `journal.list`（TanStack Query）渲染分组列表 + 加载/错误温和态 + 响应式（移动 20px 边距）+ a11y（键盘可达、焦点可见、mood 非仅颜色）~30min

## 依赖关系

- T-002 ~ T-006 依赖 T-001（设计系统）
- T-006 依赖 `1.T-003`（feature 1 的 `journal.list`）
- 本 feature 的设计系统（T-001）是 feature 3 的上游依赖

## 风险点

- self-host 字体文件需纳入 `packages/ui` 资源并确保 Vite 正确打包路径。
- Stitch 设计稿的精确间距/阴影参数以连上 Stitch MCP 后为准，PRD token 为兜底。
