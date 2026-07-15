import { describe, expect, it } from "vitest";
import { groupEntriesByDay } from "./group-by-day";
import type { JournalEntry } from "./types";

const entry = (id: string, createdAt: string): JournalEntry => ({
	id,
	body: `entry-${id}`,
	createdAt,
	deletedAt: null,
	mood: null,
	updatedAt: createdAt,
	userId: "user-1",
});

describe("groupEntriesByDay", () => {
	it("keeps server order while grouping entries by local day", () => {
		const entries = [
			entry("newest", "2026-07-15T09:00:00+08:00"),
			entry("same-day", "2026-07-15T08:00:00+08:00"),
			entry("previous-day", "2026-07-14T23:00:00+08:00"),
		];

		const groups = groupEntriesByDay(entries);

		expect(groups).toHaveLength(2);
		expect(groups[0]?.entries.map(({ id }) => id)).toEqual([
			"newest",
			"same-day",
		]);
		expect(groups[1]?.entries.map(({ id }) => id)).toEqual(["previous-day"]);
	});

	it("returns an empty list when there are no entries", () => {
		expect(groupEntriesByDay([])).toEqual([]);
	});
});
