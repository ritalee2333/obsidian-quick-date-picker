import { FormatTemplate } from "./types";
import { t } from "./i18n";

const MONTH_NAMES = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
];

const MONTH_NAMES_SHORT = [
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function validateTemplate(template: string): boolean {
	// Check for at least one date token
	return /YYYY|YY|MMMM|MMM|MM|M|DD|D/.test(template);
}

export function formatDate(date: Date, template: FormatTemplate): string {
	if (isNaN(date.getTime())) {
		return template.prefix + t("invalidDate") + template.suffix;
	}

	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const shortYear = year % 100;

	const formatted = template.dateFormat.replace(
		/YYYY|YY|MMMM|MMM|MM|M|DD|D/g,
		(match) => {
			switch (match) {
				case "YYYY": return String(year);
				case "YY": return String(shortYear).padStart(2, "0");
				case "MMMM": return MONTH_NAMES[month - 1]!;
				case "MMM": return MONTH_NAMES_SHORT[month - 1]!;
				case "MM": return String(month).padStart(2, "0");
				case "M": return String(month);
				case "DD": return String(day).padStart(2, "0");
				case "D": return String(day);
				default: return match;
			}
		}
	);

	return template.prefix + formatted + template.suffix;
}
