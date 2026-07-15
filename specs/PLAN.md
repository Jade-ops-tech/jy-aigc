# 开发计划索引

## 本次 PRD（2026-07-03）切分为 4 个 feature

来源需求文档：`docs/daily-musings-prd.md`（Daily Musings 私密微型日记）

| 序号 | feature                    | 说明                                                            | 依赖  | 状态   |
| ---- | -------------------------- | --------------------------------------------------------------- | ----- | ------ |
| 1    | journal-entry-core         | 日记记录数据模型 + tRPC CRUD（创建/倒序列表/编辑/软删除）+ 用户隔离 | -     | 已完成 |
| 2    | journal-feed-ui            | 设计系统 + 首页信息流（日记卡片、按天时间线、空状态）             | 1     | 已实现，待浏览器视觉验收 |
| 3    | journal-editor-ui          | 记录页（低干扰输入区、mood 选择器、草稿保留、编辑/删除）          | 1, 2  | 已实现，待浏览器交互验收 |
| 4    | github-token-integration   | GitHub token 加密存储 + GET /user 资料拉取 + 多 token CRUD + 表单页 | -     | 已完成 |

**推荐执行顺序**：`1` 与 `4` 并行起步 → `2` → `3`
（4 与 1/2/3 无耦合，可全程并行；2 依赖 1 的 API，3 依赖 1 的 API 与 2 的设计系统。）

## 前置说明

- 已有基础设施（不在本次范围内、可直接复用）：better-auth 邮箱/密码登录、`user/session/account/verification` 表、tRPC `protectedProcedure`、Drizzle+Neon、shadcn/ui。
- 两个 UI feature（2、3）依据 Stitch 项目 `Daily Musings`（项目 ID `16411406785799402988`）的设计稿实现。**运行 `/jy:ai` 开发前请先连上 Stitch MCP**，以便前端还原设计稿；PRD 已内联完整设计 token（色板/字体/尺寸），可作为兜底。

## ID 编号约定

- 功能需求 / 任务 / 验收标准 ID **在单个 feature 内编号**，跨 feature 用 `{序号}.` 前缀区分。
- 例：`1.T-001` = 序号 1 这个 feature 的 T-001；`4.F-005` = 序号 4 的 F-005。
- **跨 feature 依赖**写全限定 ID，如 `2.T-006 依赖 1.T-003`。
