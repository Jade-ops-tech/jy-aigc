# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `pnpm dlx ultracite fix` before committing to ensure compliance.

---

# 项目踩坑与教训(AGENTS.md)

> 自学习闭环:每个 task 沉淀「对后续开发有复用价值」的坑。每条带 task 来源。

- [T-001] `pnpm db:generate` / 任何 workspace 脚本会先跑 `pnpm install` 依赖状态检查,而 sharp@0.34.5 的 build scripts 被 ignored、需要交互式 `pnpm approve-builds` 批准,导致命令直接失败退出。绕过办法:直接用 `npx drizzle-kit generate` / `npx drizzle-kit migrate`(读同一份 drizzle.config.ts,效果等价)。根治需项目负责人决定是否 `pnpm approve-builds` 放行 sharp。
- [T-001] `packages/db` 此前只用 `db:push` 迭代 schema、migrations 目录不存在,所以第一份 migration(0000_*.sql)会连带 CREATE 既有的 user/session/account/verification/todo 表——这是全量 baseline,不是增量。只有目标库为空库时才能安全直接 migrate;若某个 DATABASE_URL 环境曾用 db:push 建过表,对它跑同一份 migration 会因表已存在而失败。新增迁移前务必确认所有环境迁移基线一致(需要时用 drizzle-kit baseline/introspect)。
- [通用] `.gitignore` 只对未跟踪文件生效,对已被 git 跟踪的文件无效。像 `.codex/config.toml` 这种已跟踪且含真实凭据(API key)的文件,加进 .gitignore 并不能阻止其进入历史;必须把密钥移到未跟踪的本地配置/环境变量并轮换已暴露的 key。
- [T-002] 新增 MCP server 配置块(如 `[mcp_servers.stitch.http_headers]` 里的 `X-Goog-Api-Key`)时,凭据绝不能直接明文写进 `.codex/config.toml`——该文件已被 git 跟踪,codex `--uncommitted` review 会把内联密钥判为 P0「block until removed and rotated」(不修不能交)。配 MCP header 从一开始就用环境变量/未跟踪本地配置读取。注意:codex review 扫的是整个工作树的未提交改动,即使 P0 不在本 task 目标文件内也会被一并拦截。
- [T-003] tRPC 子 router 拆分约定:在 `packages/api/src/routers/*.ts` 里 `export const xxxRouter` 只是定义,必须在 `packages/api/src/routers/index.ts` 的 `appRouter` 里 `xxx: xxxRouter` 挂载后前端 `trpc.xxx.*` 才可达。新增 router 文件后别忘了挂载(若挂载被单独拆成后续 task,交付前确认该 task 存在,否则接口是「写了但调不到」的死代码)。
- [T-003] 软删除表(带 `deletedAt` 列,如 journalEntry)的查询约定:list/读取类查询必须同时 `isNull(deletedAt)` 过滤软删除行 + `eq(userId, ctx.session.user.id)` 按当前用户隔离数据,两者缺一都是安全/正确性缺陷。protectedProcedure 只保证已登录,不会自动按 user 过滤数据,行级隔离要在 where 里手动写。
- [T-004] 部分更新(partial update)procedure 的 zod input 坑:要区分「字段未提供 = 不动」与「字段显式清空 = 置 null」。可清空的字段用 `.nullable().optional()`(如 `mood: moodSchema.nullable().optional()`),然后手动只把 `!== undefined` 的字段拷进 updateValues——不能直接 `.set(input)`,否则 undefined 会误清列 / null 无法清列。另配 `.refine(d => d.body !== undefined || d.mood !== undefined)` 拦「一个字段都没传」的空更新。
- [T-004] drizzle 更新/删除类 procedure 判「0 行命中」约定:用 `.update(...).set(...).where(and(eq(id), eq(userId))).returning()` 拿回数组,解构首元素 `const [updated] = ...`,`if (!updated) throw new TRPCError({ code: "NOT_FOUND" })`。别再单独 select 一次探测存在性(多一次往返且有竞态);`.returning()` 空数组即代表「不存在或非本人」,已天然把行级权限校验合进 where。
- [T-005] 软删除(把 delete 实现成 `.set({ deletedAt: now })`)的写类 procedure 若 where 只按 `id + userId`、不加 `isNull(deletedAt)`,对一条已软删记录再次 delete 会命中并重新刷新 deletedAt/updatedAt 返回 success,而非 NOT_FOUND——即非幂等。若 design 明确不要求 deletedAt 过滤则属规格内(照写),但设计软删接口时要有意识地决定语义:需要幂等/「删已删=NOT_FOUND」就必须在 where 里补 `isNull(deletedAt)`(读类查询本来就要补,见 T-003)。
- [T-006] API 集成测试用 PGlite 在进程内起真 Postgres 的模式:`vi.hoisted` 里先建 PGlite+drizzle 实例,再 `vi.mock("@jy-aigc/db", () => ({ db: testDb, createDb: () => testDb }))`,让真 tRPC router 跑真 SQL(逐用户过滤/软删/排序),无需 Neon、DATABASE_URL 或网络。hoisted 保证在 mock 工厂和 router import `db` 之前执行。可复用作后续 router 测试脚手架。
- [T-006] 测试里给 PGlite 建表时,不要用 `readFileSync` 硬编码 drizzle 迁移文件名(如 `0000_living_network.sql`)——drizzle-kit 重新生成迁移是随机名,一旦重命名整套测试会在 import 期 readFileSync 直接抛错崩溃。改为读 migrations 目录下全部 `.sql`(排序后拼接)或直接用 drizzle migrator。
- [T-006] 断言「update 会刷新 updatedAt」时,`updatedAt.getTime() >= created.updatedAt.getTime()` 是无效断言:同一毫秒内即使没刷新也会通过。要真证明刷新,应在 create 后先把 updatedAt 回改成一个更早的值,再断言严格大于(`>`)。
- [T-006] codex review 扫的是整个工作树的未提交改动:若混入大量无关的 ultracite/biome 格式化重排(几千行),`codex review --uncommitted` 会在超大 diff 上耗时过长、窗口内出不了结论。交付前把格式化改动单独提交/隔离,让 review diff 只聚焦本 task 目标文件,否则需人工另行核对目标文件。
- [T-007] 新增 required server env(如 `GITHUB_TOKEN_ENCRYPTION_KEY`)后,即使 router 测试 mock 了 `@jy-aigc/db`,只要 `appRouter` import 到使用该 env 的模块,`createEnv` 仍会在 import 期校验全部 server env。PGlite/router 测试要在 `vi.hoisted` 里先设置 DATABASE_URL/BETTER_AUTH/CORS/GitHub key 等测试假值,再 import router;否则测试套件会在 collect 阶段直接失败。
