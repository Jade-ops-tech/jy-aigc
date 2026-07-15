import type { ReactNode } from "react";

/** 记录页统一外壳：暖色画布 + 阅读栏布局，新建/编辑复用。 */
export function EditorShell({ children }: { children: ReactNode }) {
	return (
		<main className="min-h-full bg-canvas font-ui text-ink">
			<div className="reading-column flex flex-col gap-8 py-10">{children}</div>
		</main>
	);
}
