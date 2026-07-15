import type { Mood } from "@jy-aigc/api/moods";
import { useCallback, useEffect, useRef } from "react";

const DRAFT_KEY = "journal:new-draft";
const THROTTLE_MS = 500;

export interface JournalDraft {
	body: string;
	mood: Mood | null;
}

/**
 * 新建日记的草稿保留：正文/mood 节流写入 localStorage，进入时可恢复，
 * 保存或取消后清除。仅供「新建」页使用——编辑页的初值来自服务端，
 * 不读草稿，避免两者内容互相覆盖。
 */
export function useDraft() {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingRef = useRef<JournalDraft | null>(null);

	const flush = useCallback(() => {
		if (pendingRef.current) {
			localStorage.setItem(DRAFT_KEY, JSON.stringify(pendingRef.current));
			pendingRef.current = null;
		}
		timerRef.current = null;
	}, []);

	const saveDraft = useCallback(
		(draft: JournalDraft) => {
			pendingRef.current = draft;
			if (timerRef.current === null) {
				timerRef.current = setTimeout(flush, THROTTLE_MS);
			}
		},
		[flush]
	);

	const clearDraft = useCallback(() => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		pendingRef.current = null;
		localStorage.removeItem(DRAFT_KEY);
	}, []);

	const restoreDraft = useCallback((): JournalDraft | null => {
		const raw = localStorage.getItem(DRAFT_KEY);
		if (!raw) {
			return null;
		}
		try {
			const parsed = JSON.parse(raw) as Partial<JournalDraft>;
			if (typeof parsed.body === "string") {
				return { body: parsed.body, mood: parsed.mood ?? null };
			}
			return null;
		} catch {
			return null;
		}
	}, []);

	// 卸载时把仍在节流窗口内的内容落盘，避免最后几百毫秒的输入丢失。
	useEffect(
		() => () => {
			if (timerRef.current !== null) {
				clearTimeout(timerRef.current);
				flush();
			}
		},
		[flush]
	);

	return { saveDraft, clearDraft, restoreDraft };
}
