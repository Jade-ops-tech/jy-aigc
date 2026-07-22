import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { DayGroup } from "@/components/journal/day-group";
import { EmptyState } from "@/components/journal/empty-state";
import { groupEntriesByDay } from "@/components/journal/group-by-day";
import type { JournalEntry } from "@/components/journal/types";
import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/journal")({
	component: FeedRoute,
});

function FeedRoute() {
	const navigate = useNavigate();
	const entries = useQuery(trpc.journal.list.queryOptions());

	const handleSignOut = () => {
		authClient.signOut({
			fetchOptions: {
				onSuccess: () => navigate({ to: "/login" }),
			},
		});
	};

	return (
		<main className="min-h-full bg-canvas font-ui text-ink">
			<div className="reading-column flex flex-col gap-10 py-10">
				<header className="flex items-center justify-between gap-4">
					<h1 className="font-serif text-[24px] text-ink leading-[36px]">
						Daily Musings
					</h1>
					<div className="flex shrink-0 items-center gap-4">
						<Link
							className="font-ui text-[13px] text-ink-muted transition-colors hover:text-ink"
							to="/about"
						>
							About
						</Link>
						<Link
							className="font-ui text-[13px] text-ink-muted transition-colors hover:text-ink"
							to="/github"
						>
							GitHub
						</Link>
						<button
							className="font-ui text-[13px] text-ink-muted transition-colors hover:text-ink"
							onClick={handleSignOut}
							type="button"
						>
							登出
						</button>
						<Link
							className="rounded-full bg-brand px-5 py-2.5 font-ui text-[14px] text-canvas transition-opacity hover:opacity-90"
							to="/entry/new"
						>
							New Entry
						</Link>
					</div>
				</header>

				<FeedBody
					entries={entries.data ?? []}
					isError={entries.isError}
					isLoading={entries.isLoading}
				/>
			</div>
		</main>
	);
}

interface FeedBodyProps {
	entries: JournalEntry[];
	isError: boolean;
	isLoading: boolean;
}

function FeedBody({ entries, isLoading, isError }: FeedBodyProps) {
	if (isLoading) {
		return <Loader />;
	}

	if (isError) {
		return (
			<p className="py-16 text-center font-ui text-[16px] text-ink-muted leading-[24px]">
				暂时没能读取到你的记录，稍后再试试吧。
			</p>
		);
	}

	if (entries.length === 0) {
		return <EmptyState />;
	}

	const groups = groupEntriesByDay(entries);

	return (
		<div className="flex flex-col gap-10">
			{groups.map((group) => (
				<DayGroup group={group} key={group.key} />
			))}
		</div>
	);
}
