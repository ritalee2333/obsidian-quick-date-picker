import "./obsidian-dom-polyfill";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CalendarPopup } from "../src/calendar-popup";
import { DEFAULT_SETTINGS, AtDatePickerSettings } from "../src/types";

function makeSettings(overrides: Partial<AtDatePickerSettings> = {}): AtDatePickerSettings {
	return JSON.parse(JSON.stringify({ ...DEFAULT_SETTINGS, ...overrides }));
}

function makeMockPlugin(settings: AtDatePickerSettings) {
	return {
		settings,
		app: {
			setting: {
				open: vi.fn(),
				openTabById: vi.fn(),
			},
		},
		manifest: { id: "at-date-picker" },
	} as unknown as import("../src/main").default;
}

describe("CalendarPopup", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	describe("constructor", () => {
		it("initializes selectedDate to today", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			expect(popup.selectedDate.getTime()).toBe(today.getTime());
		});

		it("initializes currentMonth to the 1st of current month", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			expect(popup.currentMonth.getDate()).toBe(1);
			const today = new Date();
			expect(popup.currentMonth.getMonth()).toBe(today.getMonth());
			expect(popup.currentMonth.getFullYear()).toBe(today.getFullYear());
		});

		it("uses defaultFormat when rememberLastFormat is false", () => {
			const settings = makeSettings({ rememberLastFormat: false, lastUsedFormat: null });
			const popup = new CalendarPopup(makeMockPlugin(settings));
			expect(popup.selectedFormat.name).toBe("Standard");
		});

		it("uses lastUsedFormat when rememberLastFormat is true", () => {
			const lastFormat = makeSettings().favoriteFormats[0]!;
			const settings = makeSettings({ rememberLastFormat: true, lastUsedFormat: lastFormat });
			const popup = new CalendarPopup(makeMockPlugin(settings));
			expect(popup.selectedFormat.name).toBe(lastFormat.name);
		});

		it("creates 42 calendar cells", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			expect(popup.cellEls.length).toBe(42);
		});

		it("creates format buttons for each favorite format (up to 4)", () => {
			const settings = makeSettings({
				favoriteFormats: [
					{ name: "A", dateFormat: "YYYY", prefix: "", suffix: "" },
					{ name: "B", dateFormat: "MM", prefix: "", suffix: "" },
					{ name: "C", dateFormat: "DD", prefix: "", suffix: "" },
					{ name: "D", dateFormat: "YY", prefix: "", suffix: "" },
					{ name: "E", dateFormat: "M", prefix: "", suffix: "" },
				],
			});
			const popup = new CalendarPopup(makeMockPlugin(settings));
			expect(popup.formatButtonEls.length).toBe(4);
		});
	});

	describe("month navigation", () => {
		it("changes to previous month", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			const initialMonth = popup.currentMonth.getMonth();
			(popup as any).changeMonth(-1);
			const expected = initialMonth === 0 ? 11 : initialMonth - 1;
			expect(popup.currentMonth.getMonth()).toBe(expected);
		});

		it("changes to next month", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			const initialMonth = popup.currentMonth.getMonth();
			(popup as any).changeMonth(1);
			const expected = initialMonth === 11 ? 0 : initialMonth + 1;
			expect(popup.currentMonth.getMonth()).toBe(expected);
		});

		it("wraps year when navigating from January to previous", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			popup.currentMonth = new Date(2026, 0, 1);
			(popup as any).changeMonth(-1);
			expect(popup.currentMonth.getMonth()).toBe(11);
			expect(popup.currentMonth.getFullYear()).toBe(2025);
		});
	});

	describe("date selection", () => {
		it("selects a date and updates calendar", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			const newDate = new Date(2026, 5, 15);
			newDate.setHours(0, 0, 0, 0);
			(popup as any).selectDate(newDate);
			expect(popup.selectedDate.getTime()).toBe(newDate.getTime());
		});

		it("marks selected date cell with is-selected class", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			popup.currentMonth = new Date(2026, 4, 1); // May 2026
			(popup as any).updateCalendar();
			const may15 = new Date(2026, 4, 15);
			may15.setHours(0, 0, 0, 0);
			(popup as any).selectDate(may15);
			(popup as any).updateCalendar();

			const firstDay = new Date(2026, 4, 1);
			const startOffset = firstDay.getDay();
			const cellIndex = startOffset + 14; // May 15
			const cell = popup.cellEls[cellIndex]!;
			expect(cell.hasClass("is-selected")).toBe(true);
			expect(cell.getAttribute("aria-selected")).toBe("true");
		});
	});

	describe("format selection", () => {
		it("updates selectedFormat and button states", () => {
			const formats = [
				{ name: "Wiki", dateFormat: "YYYY-MM-DD", prefix: "[[", suffix: "]]" },
				{ name: "Plain", dateFormat: "YYYY-MM-DD", prefix: "", suffix: "" },
			];
			const settings = makeSettings({ favoriteFormats: formats });
			const popup = new CalendarPopup(makeMockPlugin(settings));
			// Must use the exact object from settings.favoriteFormats (not the local array)
			// because selectFormat uses indexOf for button lookup.
			(popup as any).selectFormat(settings.favoriteFormats[1]!);
			expect(popup.selectedFormat.name).toBe("Plain");
			expect(popup.formatButtonEls[1]!.hasClass("is-selected")).toBe(true);
			expect(popup.formatButtonEls[1]!.getAttribute("aria-pressed")).toBe("true");
		});
	});

	describe("keyboard navigation", () => {
		it("moves date by 7 days on ArrowUp", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			popup.selectedDate = new Date(2026, 4, 15);
			(popup as any).navigateCalendar("ArrowUp");
			expect(popup.selectedDate.getDate()).toBe(8);
		});

		it("moves date by 7 days on ArrowDown", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			popup.selectedDate = new Date(2026, 4, 15);
			(popup as any).navigateCalendar("ArrowDown");
			expect(popup.selectedDate.getDate()).toBe(22);
		});

		it("moves to previous month on PageUp", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			popup.selectedDate = new Date(2026, 4, 15);
			popup.currentMonth = new Date(2026, 4, 1);
			(popup as any).navigateCalendar("PageUp");
			expect(popup.selectedDate.getMonth()).toBe(3); // April
			expect(popup.currentMonth.getMonth()).toBe(3);
		});

		it("moves to first day of month on Home", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			popup.selectedDate = new Date(2026, 4, 15);
			(popup as any).navigateCalendar("Home");
			expect(popup.selectedDate.getDate()).toBe(1);
		});

		it("moves to last day of month on End", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			popup.selectedDate = new Date(2026, 4, 15);
			(popup as any).navigateCalendar("End");
			expect(popup.selectedDate.getDate()).toBe(31);
		});
	});

	describe("callbacks", () => {
		it("calls onSelect with selected date and format on Enter", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			popup.openAtCoords({ top: 0, left: 0, bottom: 0 });
			const onSelect = vi.fn();
			popup.onSelect = onSelect;
			const testDate = new Date(2026, 4, 20);
			testDate.setHours(0, 0, 0, 0);
			popup.selectedDate = testDate;
			// Focus must be inside the popup for handleKeydown to process Enter
			popup.cellEls[0]!.focus();
			(popup as any).handleKeydown(new KeyboardEvent("keydown", { key: "Enter" }));
			expect(onSelect).toHaveBeenCalledWith(testDate, popup.selectedFormat);
			popup.destroy();
		});

		it("does not call onSelect when clicking a date cell", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			popup.openAtCoords({ top: 0, left: 0, bottom: 0 });
			const onSelect = vi.fn();
			popup.onSelect = onSelect;
			popup.currentMonth = new Date(2026, 4, 1); // May 2026
			(popup as any).updateCalendar();
			// Click the cell for May 15
			const firstDay = new Date(2026, 4, 1);
			const startOffset = firstDay.getDay();
			const cellIndex = startOffset + 14; // May 15
			popup.cellEls[cellIndex]!.click();
			expect(onSelect).not.toHaveBeenCalled();
			expect(popup.selectedDate.getDate()).toBe(15);
			popup.destroy();
		});

		it("calls onSelect when clicking confirm button", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			popup.openAtCoords({ top: 0, left: 0, bottom: 0 });
			const onSelect = vi.fn();
			popup.onSelect = onSelect;
			const testDate = new Date(2026, 4, 20);
			testDate.setHours(0, 0, 0, 0);
			popup.selectedDate = testDate;
			const confirmBtn = popup.containerEl.querySelector(".at-date-confirm-btn") as HTMLElement;
			confirmBtn.click();
			expect(onSelect).toHaveBeenCalledWith(testDate, popup.selectedFormat);
			popup.destroy();
		});

		it("calls onCancel on Escape key", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			popup.openAtCoords({ top: 0, left: 0, bottom: 0 });
			const onCancel = vi.fn();
			popup.onCancel = onCancel;
			(popup as any).handleKeydown(new KeyboardEvent("keydown", { key: "Escape" }));
			expect(onCancel).toHaveBeenCalled();
		});
	});

	describe("open/close lifecycle", () => {
		it("appends container to document body when opened", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			popup.openAtCoords({ top: 100, left: 100, bottom: 120 });
			expect(document.body.contains(popup.containerEl)).toBe(true);
			popup.destroy();
		});

		it("removes container from document body when destroyed", () => {
			const popup = new CalendarPopup(makeMockPlugin(makeSettings()));
			popup.openAtCoords({ top: 100, left: 100, bottom: 120 });
			popup.destroy();
			expect(document.body.contains(popup.containerEl)).toBe(false);
		});
	});
});
