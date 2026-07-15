/**
 * mood 圆点颜色映射。mood 值本身即中文标签，颜色仅作辅助——
 * UI 始终「圆点 + 文本」同时呈现，不单靠颜色区分（a11y）。
 * 未知 mood 回退到中性描边色。
 */
const MOOD_DOT_COLOR: Record<string, string> = {
	平静: "#8aa899",
	柔软: "#d4a373",
	焦躁: "#c25b4e",
	感恩: "#e0a458",
	沉重: "#6b5b73",
	期待: "#3f7d8c",
};

const FALLBACK_DOT_COLOR = "#d4c4b7";

export function moodDotColor(mood: string | null | undefined): string {
	if (!mood) {
		return FALLBACK_DOT_COLOR;
	}
	return MOOD_DOT_COLOR[mood] ?? FALLBACK_DOT_COLOR;
}
