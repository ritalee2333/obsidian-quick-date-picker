import { describe, it, expect } from "vitest";
import { isRelativeDateInput, parseRelativeDate } from "../src/relative-date";

describe("parseRelativeDate", () => {
	it("parses +3d as 3 days in the future", () => {
		const result = parseRelativeDate("+3d");
		expect(result).not.toBeNull();
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const expected = new Date(today);
		expected.setDate(today.getDate() + 3);
		expect(result!.date.getTime()).toBe(expected.getTime());
	});

	it("parses -1w as 1 week ago", () => {
		const result = parseRelativeDate("-1w");
		expect(result).not.toBeNull();
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const expected = new Date(today);
		expected.setDate(today.getDate() - 7);
		expect(result!.date.getTime()).toBe(expected.getTime());
	});

	it("parses +2m as 2 months in the future", () => {
		const result = parseRelativeDate("+2m");
		expect(result).not.toBeNull();
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const expected = new Date(today);
		expected.setMonth(today.getMonth() + 2);
		expect(result!.date.getTime()).toBe(expected.getTime());
	});

	it("parses -1y as 1 year ago", () => {
		const result = parseRelativeDate("-1y");
		expect(result).not.toBeNull();
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const expected = new Date(today);
		expected.setFullYear(today.getFullYear() - 1);
		expect(result!.date.getTime()).toBe(expected.getTime());
	});

	it("returns null for non-relative queries", () => {
		expect(parseRelativeDate("hello")).toBeNull();
		expect(parseRelativeDate("2026-05-22")).toBeNull();
		expect(parseRelativeDate("")).toBeNull();
	});

	it("returns null for invalid unit", () => {
		expect(parseRelativeDate("+3x")).toBeNull();
	});

	it("is case-insensitive for unit", () => {
		expect(parseRelativeDate("+3D")).not.toBeNull();
		expect(parseRelativeDate("-1W")).not.toBeNull();
		expect(parseRelativeDate("+2M")).not.toBeNull();
		expect(parseRelativeDate("-1Y")).not.toBeNull();
	});

	it("accepts uppercase units while typing a relative date", () => {
		expect(isRelativeDateInput("+3D")).toBe(true);
		expect(isRelativeDateInput("-1W")).toBe(true);
		expect(isRelativeDateInput("+2M")).toBe(true);
		expect(isRelativeDateInput("-1Y")).toBe(true);
		expect(isRelativeDateInput("+3x")).toBe(false);
	});
});
