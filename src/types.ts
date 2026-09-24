export interface FormatTemplate {
	name: string;
	dateFormat: string;
	prefix: string;
	suffix: string;
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
	weekdayFormat: WeekdayFormat;
	/**
	 * 日期与星期的排列模板。
	 * 用「日期」「星期」或 {date}/{weekday} 作占位符
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
	},
	favoriteFormats: [
		{
			name: "Wiki Link",
			dateFormat: "YYYY-MM-DD",
			prefix: "[[",
			suffix: "]]",
		},
		{
			name: "Chinese",
			dateFormat: "YYYY年MM月DD日",
			prefix: "",
			suffix: "",
		},
		{
			name: "US Date",
			dateFormat: "MMM D, YYYY",
			prefix: "",
			suffix: "",
		},
	],
	rememberLastFormat: true,
	lastUsedFormat: null,
	includeWeekday: false,
	weekdayFormat: "chinese",
	weekdayArrangement: "日期 星期",
	weekdayLocale: null,
};
