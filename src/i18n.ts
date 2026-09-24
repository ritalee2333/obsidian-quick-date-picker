import type { WeekdayFormat } from "./types";

export type Locale = "zh" | "en";

const EN_MONTH_NAMES = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
];

interface WindowWithMoment extends Window {
	moment?: {
		locale: () => string;
	};
}

function detectLocale(): Locale {
	const momentLocale = (window as WindowWithMoment).moment?.locale?.();
	if (momentLocale) {
		// Obsidian syncs interface language to moment — trust it when available
		return momentLocale.startsWith("zh") ? "zh" : "en";
	}
	// Fallback to navigator only when moment is not available
	if (navigator.language?.startsWith("zh")) return "zh";
	return "en";
}

let currentLocale: Locale = "en";

export function detectAndSetLocale(): void {
	currentLocale = detectLocale();
}

export function setLocale(locale: Locale): void {
	currentLocale = locale;
}

export function getLocale(): Locale {
	return currentLocale;
}

type TranslationValue = string | ((...args: unknown[]) => string);

const dicts: Record<Locale, Record<string, TranslationValue>> = {
	zh: {
		settingTitle: "Quick Date Picker 设置",
		triggerChar: "触发字符",
		triggerCharDesc: "输入此字符后弹出日期选择器（重启 Obsidian 后生效）",
		triggerCharEmpty: "触发字符不能为空",
		rememberLastFormat: "记住上次使用的格式",
		rememberLastFormatDesc: "开启后弹窗优先选中上次使用的格式；关闭时使用默认格式",
		includeWeekday: "输出星期",
		includeWeekdayDesc: "开启后，在日期中附加星期信息",
		weekdayFormat: "星期格式",
		weekdayFormatDesc: "中文＝星期四；中文简写＝周四；英文＝Thursday；英文简写＝Thu",
		weekdayChinese: "中文（星期四）",
		weekdayShort: "中文简写（周四）",
		weekdayEnglish: "英文（Thursday）",
		weekdayEnglishShort: "英文简写（Thu）",
		weekdayArrangement: "日期与星期排列",
		weekdayArrangementDesc: "用「日期」「星期」或 {date} {weekday} 作占位符，例如：日期 星期、日期-星期、日期（星期）",
		weekdayArrangementPlaceholder: "日期 星期",
		weekdayArrangementDefault: "日期 星期",
		defaultFormat: "默认格式",
		favoriteFormats: "常用格式列表",
		addFormat: "+ 添加常用格式",
		setAsDefault: "设为默认",
		isDefault: "已是默认",
		setAsDefaultDone: "已设为默认格式",
		newFormat: "新格式",
		preview: "预览: ",
		invalidFormat: "格式无效（缺少日期标记）",
		formatName: "格式名称",
		dateFormat: "日期格式",
		dateFormatDesc: "支持: YYYY, YY, MMMM, MMM, MM, M, DD, D",
		prefix: "前缀",
		suffix: "后缀",
		noFormats: "暂无常用格式，点击下方按钮添加。",
		moveUp: "上移",
		moveDown: "下移",
		delete: "删除",
		weekdays: "日一二三四五六",
		noFavoriteFormats: "暂无常用格式（最多显示4个） ",
		goToSettings: "去设置",
		confirm: "确定",
		orPressEnter: "或按 Enter",
		navTitle: (year: number, month: number) => `${year}年${month}月`,
		previewLabel: (text: string) => `预览: ${text}`,
		invalidDate: "无效日期",
		saveSettingsFailed: (msg: number | string) => `保存设置失败: ${msg}`,
	},
	en: {
		settingTitle: "Quick Date Picker Settings",
		triggerChar: "Trigger Character",
		triggerCharDesc: "Type this character to summon the date picker (restart Obsidian to apply)",
		triggerCharEmpty: "Trigger character cannot be empty",
		rememberLastFormat: "Remember Last Format",
		rememberLastFormatDesc: "When enabled, the popup prefers your last-used format; when off, it uses the Default Format",
		includeWeekday: "Include weekday",
		includeWeekdayDesc: "Append weekday text to the formatted date",
		weekdayFormat: "Weekday format",
		weekdayFormatDesc: "Chinese＝星期四；Chinese short＝周四；English＝Thursday；English short＝Thu",
		weekdayChinese: "Chinese (星期四)",
		weekdayShort: "Chinese short (周四)",
		weekdayEnglish: "English (Thursday)",
		weekdayEnglishShort: "English short (Thu)",
		weekdayArrangement: "Date & weekday arrangement",
		weekdayArrangementDesc: "Use {date} and {weekday} as placeholders, e.g. {date} {weekday}, {date}-{weekday}, {date} ({weekday})",
		weekdayArrangementPlaceholder: "{date} {weekday}",
		weekdayArrangementDefault: "{date} {weekday}",
		defaultFormat: "Default Format",
		favoriteFormats: "Favorite Formats",
		addFormat: "+ Add Favorite Format",
		setAsDefault: "Set as Default",
		isDefault: "Default",
		setAsDefaultDone: "Set as default format",
		newFormat: "New Format",
		preview: "Preview: ",
		invalidFormat: "Invalid format (missing date token)",
		formatName: "Format Name",
		dateFormat: "Date Format",
		dateFormatDesc: "Supported: YYYY, YY, MMMM, MMM, MM, M, DD, D",
		prefix: "Prefix",
		suffix: "Suffix",
		noFormats: "No favorite formats yet. Click the button below to add one.",
		moveUp: "Move Up",
		moveDown: "Move Down",
		delete: "Delete",
		weekdays: "SMTWTFS",
		noFavoriteFormats: "No favorite formats (max 4 shown) ",
		goToSettings: "Go to Settings",
		confirm: "Confirm",
		orPressEnter: "or press Enter",
		navTitle: (year: number, month: number) => `${EN_MONTH_NAMES[month - 1]} ${year}`,
		previewLabel: (text: string) => `Preview: ${text}`,
		invalidDate: "Invalid Date",
		saveSettingsFailed: (msg: number | string) => `Failed to save settings: ${msg}`,
	},
};

/** Simple string lookup */
export function t(key: string): string {
	const value = dicts[currentLocale][key];
	if (typeof value === "string") return value;
	const fallback = dicts.en[key];
	if (typeof fallback === "string") return fallback;
	return key;
}

/** Lookup with function arguments (e.g. navTitle, previewLabel) */
export function tf(key: string, ...args: unknown[]): string {
	const value = dicts[currentLocale][key];
	if (typeof value === "function") return value(...args);
	const fallback = dicts.en[key];
	if (typeof fallback === "function") return fallback(...args);
	return key;
}

export function getLocaleWeekdayDefaults(locale: Locale = getLocale()): {
	weekdayFormat: WeekdayFormat;
	weekdayArrangement: string;
} {
	if (locale === "zh") {
		return { weekdayFormat: "chinese", weekdayArrangement: "日期 星期" };
	}
	return { weekdayFormat: "english", weekdayArrangement: "{date} {weekday}" };
}

export function mapWeekdayFormatToLocale(
	format: WeekdayFormat,
	locale: Locale
): WeekdayFormat {
	if (locale === "zh") {
		if (format === "english") return "chinese";
		if (format === "englishShort") return "short";
		return format;
	}
	if (format === "chinese") return "english";
	if (format === "short") return "englishShort";
	return format;
}

const STOCK_ARRANGEMENTS = new Set(["日期 星期", "{date} {weekday}", ""]);

/** Align weekday defaults when Obsidian UI language changes. */
export function syncWeekdayDefaultsForLocale(settings: {
	weekdayFormat: WeekdayFormat;
	weekdayArrangement: string;
	weekdayLocale: Locale | null;
}): boolean {
	const locale = getLocale();
	if (settings.weekdayLocale === locale) return false;

	const defaults = getLocaleWeekdayDefaults(locale);
	const prev = settings.weekdayLocale;
	const zhDefaults = getLocaleWeekdayDefaults("zh");
	const enDefaults = getLocaleWeekdayDefaults("en");
	const arrangement = (settings.weekdayArrangement ?? "").trim();

	if (prev == null) {
		if (locale === "en") {
			if (
				settings.weekdayFormat === zhDefaults.weekdayFormat ||
				settings.weekdayFormat === "short"
			) {
				settings.weekdayFormat = mapWeekdayFormatToLocale(settings.weekdayFormat, "en");
			}
			if (arrangement === zhDefaults.weekdayArrangement || arrangement === "") {
				settings.weekdayArrangement = enDefaults.weekdayArrangement;
			}
		} else {
			if (
				settings.weekdayFormat === enDefaults.weekdayFormat ||
				settings.weekdayFormat === "englishShort"
			) {
				settings.weekdayFormat = mapWeekdayFormatToLocale(settings.weekdayFormat, "zh");
			}
			if (arrangement === enDefaults.weekdayArrangement || arrangement === "") {
				settings.weekdayArrangement = zhDefaults.weekdayArrangement;
			}
		}
	} else {
		settings.weekdayFormat = mapWeekdayFormatToLocale(settings.weekdayFormat, locale);
		if (STOCK_ARRANGEMENTS.has(arrangement)) {
			settings.weekdayArrangement = defaults.weekdayArrangement;
		}
	}

	settings.weekdayLocale = locale;
	return true;
}
