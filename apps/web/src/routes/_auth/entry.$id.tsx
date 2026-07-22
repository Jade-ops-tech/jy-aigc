import type { Mood } from "@jy-aigc/api/moods";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { EditorShell } from "@/components/journal/editor-shell";
import { EntryEditor } from "@/components/journal/entry-editor";
import Loader from "@/components/loader";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/entry/$id")({
	component: EditEntryRoute,
});

function EditEntryRoute() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	// 复用首页的列表查询定位目标记录，避免为编辑单独新增服务端接口。
	const entries = useQuery(trpc.journal.list.queryOptions());
	const entry = entries.data?.find((item) => item.id === id);

	const invalidateAndGoHome = async () => {
		await queryClient.invalidateQueries({
			queryKey: trpc.journal.list.queryKey(),
		});
		navigate({ to: "/journal" });
	};

	const updateMutation = useMutation(
		trpc.journal.update.mutationOptions({
			onSuccess: invalidateAndGoHome,
		})
	);
	const deleteMutation = useMutation(
		trpc.journal.delete.mutationOptions({
			onSuccess: invalidateAndGoHome,
		})
	);

	if (entries.isLoading) {
		return (
			<EditorShell>
				<Loader />
			</EditorShell>
		);
	}

	if (!entry) {
		return (
			<EditorShell>
				<p className="py-16 text-center font-ui text-[16px] text-ink-muted leading-[24px]">
					没有找到这条记录，它可能已被删除。
				</p>
				<Link
					className="self-center rounded-full bg-brand px-6 py-2.5 font-ui text-[14px] text-canvas transition-opacity hover:opacity-90"
					to="/journal"
				>
					回到首页
				</Link>
			</EditorShell>
		);
	}

	return (
		<EditorShell>
			<h1 className="font-serif text-[24px] text-ink leading-[36px]">
				编辑记录
			</h1>
			<EntryEditor
				initialBody={entry.body}
				initialMood={(entry.mood as Mood | null) ?? null}
				isDeleting={deleteMutation.isPending}
				isSaving={updateMutation.isPending}
				mode="edit"
				onCancel={() => navigate({ to: "/journal" })}
				onDelete={() => deleteMutation.mutate({ id })}
				onSave={({ body, mood }) => updateMutation.mutate({ id, body, mood })}
			/>
		</EditorShell>
	);
}
