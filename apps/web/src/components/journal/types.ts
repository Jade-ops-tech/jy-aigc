import type { AppRouter } from "@jy-aigc/api/routers/index";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;

/** 单条日记（从 journal.list 输出推导，避免前后端类型漂移）。 */
export type JournalEntry = RouterOutputs["journal"]["list"][number];
