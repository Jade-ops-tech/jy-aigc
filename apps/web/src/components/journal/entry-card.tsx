import { Link } from "@tanstack/react-router";

import { moodDotColor } from "./mood";
import type { JournalEntry } from "./types";

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
	hour: "2-digit",
	minute: "2-digit",
	hour12: false,
});

interface EntryCardProps {
	entry: JournalEntry;
}

/**
 * 单条日记卡片：≥24px 内边距、20px 圆角、柔和暖色阴影，
 * 正文用 Literata（font-serif），底部元数据用紧凑 UI 标签。
 * mood 以「圆点 + 文本」呈现，颜色仅为辅助。
 */
export function EntryCard({ entry }: EntryCardProps) {
	const createdAt = new Date(entry.createdAt);
	const timeLabel = timeFormatter.format(createdAt);

	return (
		<Link
			className="block rounded-[20px] bg-surface p-6 shadow-[0_2px_16px_rgba(125,86,45,0.08)] ring-1 ring-outline/40 transition-shadow hover:shadow-[0_4px_24px_rgba(125,86,45,0.12)] focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
			params={{ id: entry.id }}
			to="/entry/$id"
		>
			<p className="whitespace-pre-wrap font-serif text-[18px] text-ink leading-[30px]">
				{entry.body}
			</p>
			<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-ui text-[12px] text-ink-muted uppercase tracking-wide">
				<time dateTime={createdAt.toISOString()}>{timeLabel}</time>
				{entry.mood ? (
					<span className="flex items-center gap-1.5 normal-case tracking-normal">
						<span
							aria-hidden="true"
							className="h-2 w-2 shrink-0 rounded-full"
							style={{ backgroundColor: moodDotColor(entry.mood) }}
						/>
						{entry.mood}
					</span>
				) : null}
			</div>
		</Link>
	);
}
