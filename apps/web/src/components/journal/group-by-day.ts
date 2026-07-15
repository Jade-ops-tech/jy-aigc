import type { JournalEntry } from "./types";

export interface DayGroup {
	/** 组头展示文案，如「7月4日 · 周五」。 */
	dateLabel: string;
	entries: JournalEntry[];
	/** 本地日期 key（YYYY-MM-DD），用于稳定分组与 React key。 */
	key: string;
}

const dateLabelFormatter = new Intl.DateTimeFormat("zh-CN", {
	month: "long",
	day: "numeric",
	weekday: "short",
});

/** 本地日期 key（避免 UTC 偏移把跨零点的记录分到错误的一天）。 */
function localDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * 把服务端已倒序返回的日记按「本地自然日」分组，保持组间与组内的倒序顺序。
 * createdAt 经 JSON 传输后可能为字符串，统一用 new Date 兜底。
 */
export function groupEntriesByDay(entries: JournalEntry[]): DayGroup[] {
	const groups = new Map<string, DayGroup>();

	for (const entry of entries) {
		const date = new Date(entry.createdAt);
		const key = localDateKey(date);
		const existing = groups.get(key);

		if (existing) {
			existing.entries.push(entry);
		} else {
			groups.set(key, {
				key,
				dateLabel: dateLabelFormatter.format(date),
				entries: [entry],
			});
		}
	}

	return [...groups.values()];
}
