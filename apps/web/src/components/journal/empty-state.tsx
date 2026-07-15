import { Link } from "@tanstack/react-router";

/**
 * 空状态：无记录时渲染。充足留白 + 邀请书写的温和文案 + 指向记录页的入口。
 */
export function EmptyState() {
	return (
		<div className="flex flex-col items-center gap-6 px-4 py-24 text-center">
			<div className="flex flex-col gap-3">
				<h2 className="font-serif text-[24px] text-ink leading-[36px]">
					这里还很安静
				</h2>
				<p className="max-w-sm font-ui text-[16px] text-ink-muted leading-[24px]">
					留住此刻的心绪吧——哪怕只是一句话。往后回望，它们都会成为温柔的痕迹。
				</p>
			</div>
			<Link
				className="rounded-full bg-brand px-6 py-3 font-ui text-[16px] text-canvas transition-opacity hover:opacity-90"
				to="/entry/new"
			>
				写下第一篇
			</Link>
		</div>
	);
}
