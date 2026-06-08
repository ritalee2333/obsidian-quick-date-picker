import { FormatTemplate } from "./types";

export function validateTemplate(template: string): boolean {
	// Check for at least one date token
	return /YYYY|YY|MM|M|DD|D/.test(template);
}

export function formatDate(date: Date, template: FormatTemplate): string {
	if (isNaN(date.getTime())) {
		return template.prefix + "无效日期" + template.suffix;
	}

	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const shortYear = year % 100;

	let formatted = template.dateFormat;
	formatted = formatted.replace(/YYYY/g, String(year));
	formatted = formatted.replace(/YY/g, String(shortYear).padStart(2, "0"));
	formatted = formatted.replace(/MM/g, String(month).padStart(2, "0"));
	formatted = formatted.replace(/M(?!M)/g, String(month));
	formatted = formatted.replace(/DD/g, String(day).padStart(2, "0"));
	formatted = formatted.replace(/D(?!D)/g, String(day));

	return template.prefix + formatted + template.suffix;
}
