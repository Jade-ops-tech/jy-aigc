import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { EditorShell } from "@/components/journal/editor-shell";
import { EntryEditor } from "@/components/journal/entry-editor";
import { useDraft } from "@/hooks/use-draft";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/entry/new")({
	component: NewEntryRoute,
});

function NewEntryRoute() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { saveDraft, clearDraft, restoreDraft } = useDraft();
	// 仅在挂载时读取一次草稿，作为编辑器初值。
	const [initialDraft] = useState(() => restoreDraft());

	const createMutation = useMutation(
		trpc.journal.create.mutationOptions({
			onSuccess: async () => {
				clearDraft();
				await queryClient.invalidateQueries({
					queryKey: trpc.journal.list.queryKey(),
				});
				navigate({ to: "/" });
			},
		})
	);

	const goHome = () => {
		clearDraft();
		navigate({ to: "/" });
	};

	return (
		<EditorShell>
			<h1 className="font-serif text-[24px] text-ink leading-[36px]">
				记下此刻
			</h1>
			<EntryEditor
				initialBody={initialDraft?.body}
				initialMood={initialDraft?.mood ?? null}
				isSaving={createMutation.isPending}
				mode="new"
				onCancel={goHome}
				onChange={({ body, mood }) => saveDraft({ body, mood })}
				onSave={({ body, mood }) =>
					createMutation.mutate({ body, mood: mood ?? undefined })
				}
			/>
		</EditorShell>
	);
}
