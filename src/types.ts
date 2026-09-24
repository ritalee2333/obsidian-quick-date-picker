export interface FormatTemplate {
	name: string;
	dateFormat: string;
	prefix: string;
	suffix: string;
	/** Per-format weekday style when「输出星期」is on */
	weekdayFormat?: WeekdayFormat;
	/** Per-format date/weekday arrangement pattern */
	weekdayArrangement?: string;
}

/** 中文＝星期四；中文简写＝周四；英文＝Thursday；英文简写＝Thu */
export type WeekdayFormat = "chinese" | "short" | "english" | "englishShort";

export interface AtDatePickerSettings {
	triggerChar: string;
	defaultFormat: FormatTemplate;
	favoriteFormats: FormatTemplate[];
	rememberLastFormat: boolean;
	lastUsedFormat: FormatTemplate | null;
	/** 是否在输出日期后附加星期信息 */
	includeWeekday: boolean;
	/**
	 * Legacy global weekday style — kept as migration fallback.
	 * Prefer FormatTemplate.weekdayFormat going forward.
	 */
	weekdayFormat: WeekdayFormat;
	/**
	 * Legacy global weekday arrangement — kept as migration fallback.
	 * Prefer FormatTemplate.weekdayArrangement going forward.
	 */
	weekdayArrangement: string;
	/** 星期相关默认值上次对齐的 UI 语言 */
	weekdayLocale: "zh" | "en" | null;
}

export const DEFAULT_SETTINGS: AtDatePickerSettings = {
	triggerChar: "@",
	defaultFormat: {
		name: "Standard",
		dateFormat: "YYYY-MM-DD",
		prefix: "",
		suffix: "",
		weekdayFormat: "chinese",
		weekdayArrangement: "日期 星期",
	},
	favoriteFormats: [
		{
			name: "Wiki Link",
			dateFormat: "YYYY-MM-DD",
			prefix: "[[",
			suffix: "]]",
			weekdayFormat: "chinese",
			weekdayArrangement: "日期 星期",
		},
		{
			name: "Chinese",
			dateFormat: "YYYY年MM月DD日",
			prefix: "",
			suffix: "",
			weekdayFormat: "chinese",
			weekdayArrangement: "日期 星期",
		},
		{
			name: "US Date",
			dateFormat: "MMM D, YYYY",
			prefix: "",
			suffix: "",
			weekdayFormat: "englishShort",
			weekdayArrangement: "{date} {weekday}",
		},
	],
	rememberLastFormat: true,
	lastUsedFormat: null,
	includeWeekday: false,
	weekdayFormat: "chinese",
	weekdayArrangement: "日期 星期",
	weekdayLocale: null,
};

/** Fill missing per-format weekday fields from legacy global fallbacks. */
export function ensureFormatWeekdayFields(
	settings: AtDatePickerSettings
): boolean {
	const fallbackFormat = settings.weekdayFormat ?? "chinese";
	const fallbackArrangement = settings.weekdayArrangement || "日期 星期";
	let changed = false;

	const ensure = (format: FormatTemplate | null | undefined): void => {
		if (!format) return;
		if (!format.weekdayFormat) {
			format.weekdayFormat = fallbackFormat;
			changed = true;
		}
		if (!format.weekdayArrangement) {
			format.weekdayArrangement = fallbackArrangement;
			changed = true;
		}
	};

	ensure(settings.defaultFormat);
	for (const format of settings.favoriteFormats ?? []) {
		ensure(format);
	}
	ensure(settings.lastUsedFormat);

	return changed;
}
