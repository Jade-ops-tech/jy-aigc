# journal-editor-ui — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-07-03 | v1   | 初始任务 |

## 项目信息

- 项目名: jy-aigc
- 架构类型: pnpm/Turborepo monorepo（React + Vite + TanStack Router + tRPC）
- specs 路径: specs/3.journal-editor-ui/

## 任务列表

### 功能 1: 记录页输入

- [x] T-001: 新增 `apps/web/src/routes/_auth/entry.new.tsx` + `entry.$id.tsx`（登录保护），大面积低干扰 `<textarea>`（Literata、无厚边框、温暖聚焦态、可访问 label）~30min
- [x] T-002: `MoodPicker` 组件，复用 `@jy-aigc/api` 的 `MOODS`，单选可取消 chip，文本+柔和色（非仅颜色），键盘可达 + `aria-pressed` ~30min

### 功能 2: 保存 / 取消 / 删除

- [x] T-003: 保存联动：新建走 `journal.create`、编辑走 `journal.update`，成功后失效 `journal.list` 并返回首页；空正文禁用保存 + 温和提示 ~30min
- [x] T-004: 取消返回首页 + 编辑态删除按钮（二次确认对话框 → `journal.delete` → 返回首页）~30min
- [x] T-005: 编辑入口：首页卡片点击进入 `entry.$id`，预填 body/mood（对接 `2.T-003`）~15min

### 功能 3: 草稿保留

- [x] T-006: `useDraft` hook：新建页正文/mood 节流写入 localStorage，进入时恢复，保存/取消后清除 ~30min

## 依赖关系

- T-002 依赖 `1.T-002`（`MOODS` 导出）
- T-003 依赖 `1.T-002`（create）与 `1.T-004`（update）；T-004 依赖 `1.T-005`（delete）
- T-001 ~ T-006 依赖 `2.T-001`（设计系统）；T-005 依赖 `2.T-003`（卡片入口）
- 本 feature 无下游依赖

## 风险点

- textarea 自动增高与移动端键盘弹出的视口处理需实测。
- 草稿恢复与编辑预填的状态来源需清晰隔离（编辑态不读草稿），避免内容互相覆盖。
