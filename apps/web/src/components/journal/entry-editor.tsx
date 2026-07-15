import type { Mood } from "@jy-aigc/api/moods";
import { useEffect, useId, useRef, useState } from "react";

import { MoodPicker } from "./mood-picker";

export interface EntryEditorValue {
	body: string;
	mood: Mood | null;
}

interface EntryEditorProps {
	initialBody?: string;
	initialMood?: Mood | null;
	isDeleting?: boolean;
	isSaving: boolean;
	mode: "new" | "edit";
	onCancel: () => void;
	/** 每次内容变化回调，供新建页写草稿。 */
	onChange?: (value: EntryEditorValue) => void;
	/** 仅编辑态提供：触发删除。 */
	onDelete?: () => void;
	onSave: (value: EntryEditorValue) => void;
}

/**
 * 记录页编辑器：大面积低干扰 textarea（Literata、无厚边框、温暖聚焦态、
 * 有可访问 label）+ MoodPicker + 保存/取消；编辑态额外提供带二次确认的删除。
 * 内部维护 body/mood，初值在挂载时确定（父组件应在数据就绪后再挂载）。
 */
export function EntryEditor({
	mode,
	initialBody = "",
	initialMood = null,
	isSaving,
	isDeleting = false,
	onSave,
	onCancel,
	onDelete,
	onChange,
}: EntryEditorProps) {
	const [body, setBody] = useState(initialBody);
	const [mood, setMood] = useState<Mood | null>(initialMood);
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const bodyFieldId = useId();

	const trimmedBody = body.trim();
	const canSave = trimmedBody.length > 0 && !isSaving;

	// textarea 自动增高：随内容撑开，避免内部滚动条打断书写。
	// body 是有意保留的触发依赖——内容变化后需重算高度，虽未在 effect 内直接读取。
	// biome-ignore lint/correctness/useExhaustiveDependencies: body 用作重算高度的触发依赖
	useEffect(() => {
		const el = textareaRef.current;
		if (!el) {
			return;
		}
		el.style.height = "auto";
		el.style.height = `${el.scrollHeight}px`;
	}, [body]);

	const emitChange = (next: EntryEditorValue) => {
		onChange?.(next);
	};

	const handleBodyChange = (value: string) => {
		setBody(value);
		emitChange({ body: value, mood });
	};

	const handleMoodChange = (next: Mood | null) => {
		setMood(next);
		emitChange({ body, mood: next });
	};

	const handleSave = () => {
		if (!canSave) {
			return;
		}
		onSave({ body: trimmedBody, mood });
	};

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-2">
				<label className="sr-only" htmlFor={bodyFieldId}>
					此刻的心绪
				</label>
				<textarea
					className="min-h-[40vh] w-full resize-none border-0 bg-transparent font-serif text-[18px] text-ink leading-[30px] outline-none placeholder:text-ink-muted/60 focus:ring-0"
					id={bodyFieldId}
					onChange={(event) => handleBodyChange(event.target.value)}
					placeholder="写下此刻的心绪……"
					ref={textareaRef}
					value={body}
				/>
			</div>

			<MoodPicker onChange={handleMoodChange} value={mood} />

			<div className="flex flex-wrap items-center justify-between gap-4 border-outline/60 border-t pt-6">
				<div className="flex items-center gap-3">
					<button
						className="rounded-full bg-brand px-6 py-2.5 font-ui text-[14px] text-canvas transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
						disabled={!canSave}
						onClick={handleSave}
						type="button"
					>
						{isSaving ? "保存中…" : "保存"}
					</button>
					<button
						className="rounded-full px-4 py-2.5 font-ui text-[14px] text-ink-muted transition-colors hover:text-ink"
						onClick={onCancel}
						type="button"
					>
						取消
					</button>
					{trimmedBody.length === 0 ? (
						<span className="font-ui text-[12px] text-ink-muted/70">
							写点什么才能保存
						</span>
					) : null}
				</div>

				{mode === "edit" && onDelete ? (
					<DeleteControl
						confirming={confirmingDelete}
						isDeleting={isDeleting}
						onCancel={() => setConfirmingDelete(false)}
						onConfirm={onDelete}
						onStart={() => setConfirmingDelete(true)}
					/>
				) : null}
			</div>
		</div>
	);
}

interface DeleteControlProps {
	confirming: boolean;
	isDeleting: boolean;
	onCancel: () => void;
	onConfirm: () => void;
	onStart: () => void;
}

/** 删除的二次确认：先点「删除」展开确认区，再确认才真正删除。 */
function DeleteControl({
	confirming,
	isDeleting,
	onStart,
	onCancel,
	onConfirm,
}: DeleteControlProps) {
	if (!confirming) {
		return (
			<button
				className="rounded-full px-4 py-2.5 font-ui text-[14px] text-ink-muted/80 transition-colors hover:text-[#c25b4e]"
				onClick={onStart}
				type="button"
			>
				删除
			</button>
		);
	}

	return (
		<fieldset className="m-0 flex min-w-0 items-center gap-2 border-0 p-0">
			<legend className="sr-only">确认删除</legend>
			<span className="font-ui text-[13px] text-ink-muted">确认删除？</span>
			<button
				className="rounded-full bg-[#c25b4e] px-4 py-2 font-ui text-[13px] text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
				disabled={isDeleting}
				onClick={onConfirm}
				type="button"
			>
				{isDeleting ? "删除中…" : "删除"}
			</button>
			<button
				className="rounded-full px-3 py-2 font-ui text-[13px] text-ink-muted transition-colors hover:text-ink"
				onClick={onCancel}
				type="button"
			>
				取消
			</button>
		</fieldset>
	);
}
