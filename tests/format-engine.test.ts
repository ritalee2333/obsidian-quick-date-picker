import { describe, it, expect } from "vitest";
import { formatDate, validateTemplate } from "../src/format-engine";
import { FormatTemplate } from "../src/types";

const fixedDate = new Date(2026, 4, 22); // May 22, 2026

function makeTemplate(dateFormat: string, prefix = "", suffix = ""): FormatTemplate {
	return { name: "Test", dateFormat, prefix, suffix };
}

describe("validateTemplate", () => {
	it("accepts templates with YYYY", () => {
		expect(validateTemplate("YYYY-MM-DD")).toBe(true);
	});

	it("accepts templates with YY", () => {
		expect(validateTemplate("YYMMDD")).toBe(true);
	});

	it("accepts templates with M and D", () => {
		expect(validateTemplate("M/D/YYYY")).toBe(true);
	});

	it("accepts templates with MMMM", () => {
		expect(validateTemplate("MMMM D, YYYY")).toBe(true);
	});

	it("accepts templates with MMM", () => {
		expect(validateTemplate("MMM D, YYYY")).toBe(true);
	});

	it("rejects templates without any date token", () => {
		expect(validateTemplate("Hello World")).toBe(false);
	});

	it("rejects empty templates", () => {
		expect(validateTemplate("")).toBe(false);
	});
});

describe("formatDate", () => {
	it("formats YYYY-MM-DD", () => {
		const result = formatDate(fixedDate, makeTemplate("YYYY-MM-DD"));
		expect(result).toBe("2026-05-22");
	});

	it("formats YYMMDD", () => {
		const result = formatDate(fixedDate, makeTemplate("YYMMDD"));
		expect(result).toBe("260522");
	});

	it("formats Chinese date", () => {
		const result = formatDate(fixedDate, makeTemplate("YYYY年MM月DD日"));
		expect(result).toBe("2026年05月22日");
	});

	it("formats M/D/YYYY without leading zeros", () => {
		const result = formatDate(fixedDate, makeTemplate("M/D/YYYY"));
		expect(result).toBe("5/22/2026");
	});

	it("handles single-digit month with M", () => {
		const jan1 = new Date(2026, 0, 1);
		const result = formatDate(jan1, makeTemplate("M/D"));
		expect(result).toBe("1/1");
	});

	it("handles prefix and suffix", () => {
		const result = formatDate(fixedDate, makeTemplate("YYYY-MM-DD", "[[", "]]"));
		expect(result).toBe("[[2026-05-22]]");
	});

	it("handles emoji prefix", () => {
		const result = formatDate(fixedDate, makeTemplate("YYYY-MM-DD", "📅 ", ""));
		expect(result).toBe("📅 2026-05-22");
	});

	it("formats DD.MM.YYYY", () => {
		const result = formatDate(fixedDate, makeTemplate("DD.MM.YYYY"));
		expect(result).toBe("22.05.2026");
	});

	it("formats MMMM D, YYYY with full month name", () => {
		const result = formatDate(fixedDate, makeTemplate("MMMM D, YYYY"));
		expect(result).toBe("May 22, 2026");
	});

	it("formats MMM D, YYYY with short month name", () => {
		const result = formatDate(fixedDate, makeTemplate("MMM D, YYYY"));
		expect(result).toBe("May 22, 2026");
	});

	it("formats December with MMMM", () => {
		const dec25 = new Date(2026, 11, 25);
		const result = formatDate(dec25, makeTemplate("MMMM D, YYYY"));
		expect(result).toBe("December 25, 2026");
	});

	it("formats December with MMM", () => {
		const dec25 = new Date(2026, 11, 25);
		const result = formatDate(dec25, makeTemplate("MMM D, YYYY"));
		expect(result).toBe("Dec 25, 2026");
	});

	it("formats MM/DD/YYYY US style", () => {
		const result = formatDate(fixedDate, makeTemplate("MM/DD/YYYY"));
		expect(result).toBe("05/22/2026");
	});

	it("formats DD/MM/YYYY UK style", () => {
		const result = formatDate(fixedDate, makeTemplate("DD/MM/YYYY"));
		expect(result).toBe("22/05/2026");
	});

	it("appends Chinese weekday when enabled", () => {
		const result = formatDate(fixedDate, makeTemplate("YYYY-MM-DD"), {
			includeWeekday: true,
			weekdayFormat: "chinese",
			weekdayArrangement: "日期 星期",
		});
		expect(result).toBe("2026-05-22 星期五");
	});

	it("appends English short weekday with custom arrangement", () => {
		const result = formatDate(fixedDate, makeTemplate("YYYY-MM-DD"), {
			includeWeekday: true,
			weekdayFormat: "englishShort",
			weekdayArrangement: "{date} ({weekday})",
		});
		expect(result).toBe("2026-05-22 (Fri)");
	});
});
