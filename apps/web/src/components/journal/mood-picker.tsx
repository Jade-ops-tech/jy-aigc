import { MOODS, type Mood } from "@jy-aigc/api/moods";
import { cn } from "@jy-aigc/ui/lib/utils";

import { moodDotColor } from "./mood";

interface MoodPickerProps {
	onChange: (mood: Mood | null) => void;
	value: Mood | null;
}

/**
 * 心情选择器：复用 @jy-aigc/api 的 MOODS。单选、再次点击可取消。
 * 每个 chip 是「柔和色圆点 + 文本」，不单靠颜色区分（a11y）；
 * 用原生 <button> + aria-pressed，键盘天然可达。
 */
export function MoodPicker({ value, onChange }: MoodPickerProps) {
	return (
		<fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
			<legend className="sr-only">心情</legend>
			{MOODS.map((mood) => {
				const selected = value === mood;
				return (
					<button
						aria-pressed={selected}
						className={cn(
							"flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-ui text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
							selected
								? "border-brand bg-brand-container/40 text-ink"
								: "border-outline bg-surface-low text-ink-muted hover:border-brand-container"
						)}
						key={mood}
						onClick={() => onChange(selected ? null : mood)}
						type="button"
					>
						<span
							aria-hidden="true"
							className="h-2 w-2 shrink-0 rounded-full"
							style={{ backgroundColor: moodDotColor(mood) }}
						/>
						{mood}
					</button>
				);
			})}
		</fieldset>
	);
}
