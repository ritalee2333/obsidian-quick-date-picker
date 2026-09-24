import { AtDatePickerSettings, FormatTemplate, WeekdayFormat } from "./types";
import { getLocale, t } from "./i18n";

const MONTH_NAMES = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
];

const MONTH_NAMES_SHORT = [
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const WEEKDAY_CHINESE = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const WEEKDAY_SHORT = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const WEEKDAY_ENGLISH = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_ENGLISH_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface FormatOptions {
	includeWeekday?: boolean;
	weekdayFormat?: WeekdayFormat;
	weekdayArrangement?: string;
}

export function formatOptionsFromSettings(settings: AtDatePickerSettings): FormatOptions {
	return {
		includeWeekday: settings.includeWeekday,
		weekdayFormat: settings.weekdayFormat,
		weekdayArrangement: settings.weekdayArrangement,
	};
}

export function validateTemplate(template: string): boolean {
	// Check for at least one date token
	return /YYYY|YY|MMMM|MMM|MM|M|DD|D/.test(template);
}

export function formatWeekday(date: Date, format: WeekdayFormat = "chinese"): string {
	const day = date.getDay(); // 0 = Sunday
	switch (format) {
		case "english":
			return WEEKDAY_ENGLISH[day]!;
		case "englishShort":
			return WEEKDAY_ENGLISH_SHORT[day]!;
		case "short":
			return WEEKDAY_SHORT[day]!;
		case "chinese":
		default:
			return WEEKDAY_CHINESE[day]!;
	}
}

/**
 * Combine date + weekday using an arrangement pattern.
 * Placeholders: 日期 / {date}, 星期 / {weekday}
 */
export function arrangeDateWeekday(
	dateStr: string,
	weekdayStr: string,
	arrangement?: string
): string {
	const fallback = getLocale() === "zh" ? "日期 星期" : "{date} {weekday}";
	const raw = arrangement ?? fallback;
	const pattern = raw.trim() === "" ? fallback : raw;
	const hasPlaceholder = /\{date\}|\{weekday\}|日期|星期/.test(pattern);

	if (!hasPlaceholder) {
		return `${dateStr}${pattern}${weekdayStr}`;
	}

	// Replace Chinese placeholders before brace ones so "星期五" is not re-matched.
	return pattern
		.replace(/日期/g, dateStr)
		.replace(/星期/g, weekdayStr)
		.replace(/\{date\}/g, dateStr)
		.replace(/\{weekday\}/g, weekdayStr);
}

export function formatDate(
	date: Date,
	template: FormatTemplate,
	options?: FormatOptions
): string {
	if (isNaN(date.getTime())) {
		return template.prefix + t("invalidDate") + template.suffix;
	}

	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const shortYear = year % 100;
	const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);
	const monthName = MONTH_NAMES[month - 1] ?? "";
	const monthNameShort = MONTH_NAMES_SHORT[month - 1] ?? "";

	let formatted = template.dateFormat.replace(
		/YYYY|YY|MMMM|MMM|MM|M|DD|D/g,
		(match): string => {
			switch (match) {
				case "YYYY": return `${year}`;
				case "YY": return pad2(shortYear);
				case "MMMM": return monthName;
				case "MMM": return monthNameShort;
				case "MM": return pad2(month);
				case "M": return `${month}`;
				case "DD": return pad2(day);
				case "D": return `${day}`;
				default: return match;
			}
		}
	);

	if (options?.includeWeekday) {
		const weekday = formatWeekday(
			date,
			options.weekdayFormat ?? (getLocale() === "zh" ? "chinese" : "english")
		);
		formatted = arrangeDateWeekday(formatted, weekday, options.weekdayArrangement);
	}

	return template.prefix + formatted + template.suffix;
}
