import { EntryCard } from "./entry-card";
import type { DayGroup as DayGroupData } from "./group-by-day";

interface DayGroupProps {
	group: DayGroupData;
}

/**
 * 按天分组区块：紧凑日期 tag 作组头，同组卡片左侧用一条细竖线（时间线）串联，
 * 组间垂直间距在父容器（信息流）上以较大 gap 体现。
 */
export function DayGroup({ group }: DayGroupProps) {
	return (
		<section aria-label={group.dateLabel}>
			<h2 className="mb-3 font-ui text-[12px] text-ink-muted uppercase tracking-[0.08em]">
				{group.dateLabel}
			</h2>
			<div className="relative flex flex-col gap-4 pl-5">
				<span
					aria-hidden="true"
					className="absolute top-1 bottom-1 left-0 w-px bg-outline"
				/>
				{group.entries.map((entry) => (
					<EntryCard entry={entry} key={entry.id} />
				))}
			</div>
		</section>
	);
}
