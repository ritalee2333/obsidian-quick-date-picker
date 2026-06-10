import { Plugin, Notice } from "obsidian";
import { AtDatePickerSettings, DEFAULT_SETTINGS } from "./types";
import { AtDateSettingTab } from "./settings";
import { AtDateEditorSuggest } from "./suggest";
import { CalendarPopup } from "./calendar-popup";
import { formatDate } from "./format-engine";
import { isRelativeDateInput, parseRelativeDate } from "./relative-date";
import { tf, detectAndSetLocale } from "./i18n";

/** Popout-window compatible document reference */
const DOC: Document = typeof activeDocument !== "undefined" ? activeDocument : document;

export default class AtDatePickerPlugin extends Plugin {
	settings: AtDatePickerSettings;
	titlePopup: CalendarPopup | null = null;
	private isDispatchingTitleInput = false;

	async onload() {
		detectAndSetLocale();
		await this.loadSettings();
		this.addSettingTab(new AtDateSettingTab(this.app, this));
		this.suggest = new AtDateEditorSuggest(this.app, this);
		this.registerEditorSuggest(this.suggest);
		this.registerTitleInputHandler();
		this.registerTitleEnterHandler();
	}

	onunload() {
		// registerDomEvent listeners are auto-cleaned by Obsidian on plugin unload
		this.closeTitlePopup();
		this.suggest?.destroy();
	}

	private suggest: AtDateEditorSuggest | null = null;

	async loadSettings() {
		const data = (await this.loadData()) as Partial<AtDatePickerSettings> | null;
		this.settings = JSON.parse(JSON.stringify({ ...DEFAULT_SETTINGS, ...(data || {}) }));
	}

	async saveSettings() {
		try {
			await this.saveData(this.settings);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			new Notice(tf("saveSettingsFailed", msg));
			console.error("[Quick Date Picker] saveSettings failed:", err);
		}
	}

	private registerTitleInputHandler(): void {
		this.registerDomEvent(DOC, "input", (evt: InputEvent) => {
			if (this.isDispatchingTitleInput) return;

			const target = evt.target as HTMLElement;
			if (!target || !this.isTitleInputElement(target)) return;

			const trigger = this.settings.triggerChar;
			const text = target.textContent || "";
			const selection = window.getSelection();
			if (!selection || !selection.rangeCount) return;

			// Get cursor position relative to element text
			const range = selection.getRangeAt(0);
			const preCaretRange = range.cloneRange();
			preCaretRange.selectNodeContents(target);
			preCaretRange.setEnd(range.endContainer, range.endOffset);
			const cursorPos = preCaretRange.toString().length;

			const beforeCursor = text.slice(0, cursorPos);
			const triggerIndex = beforeCursor.lastIndexOf(trigger);
			if (triggerIndex === -1) return;

			const query = beforeCursor.slice(triggerIndex + trigger.length);
			if (query.length > 0 && !isRelativeDateInput(query)) return;

			const relative = parseRelativeDate(query);
			if (relative) {
				const template = this.settings.lastUsedFormat ??
					this.settings.defaultFormat;
				const dateText = formatDate(relative.date, template);
				const newText = text.slice(0, triggerIndex) + dateText + text.slice(cursorPos);
				target.textContent = newText;
				this.setTitleCursor(target, triggerIndex + dateText.length);
				this.dispatchTitleInput(target, dateText);
				this.settings.lastUsedFormat = template;
				void this.saveSettings();
				// Reset IME composition state to prevent trailing character output
				target.blur();
				target.focus();
				this.closeTitlePopup();
				return;
			}

			// Close existing popup
			this.closeTitlePopup();

			// Create and show popup
			this.titlePopup = new CalendarPopup(this);
			this.titlePopup.onSelect = (date, format) => {
				const dateText = formatDate(date, format);
				const newText = text.slice(0, triggerIndex) + dateText + text.slice(cursorPos);
				target.textContent = newText;

				// Restore cursor position after inserted text
				this.setTitleCursor(target, triggerIndex + dateText.length);
				this.dispatchTitleInput(target, dateText);

				if (this.settings.rememberLastFormat) {
					this.settings.lastUsedFormat = format;
					void this.saveSettings();
				}
				// Refocus title before destroying popup to keep the cursor alive
				target.focus();
				this.closeTitlePopup();
			};

			this.titlePopup.onCancel = () => {
				this.closeTitlePopup();
			};

			// Position popup below the title element
			const rect = target.getBoundingClientRect();
			this.titlePopup.openAtCoords({
				left: rect.left + rect.width / 2,
				top: rect.top,
				bottom: rect.bottom,
			}, false);
		});
	}

	private isTitleInputElement(el: HTMLElement): boolean {
		return el.classList.contains("inline-title") ||
			el.classList.contains("view-header-title") ||
			!!el.closest(".inline-title") ||
			!!el.closest(".view-header-title");
	}

	private closeTitlePopup(): void {
		if (this.titlePopup) {
			this.titlePopup.destroy();
			this.titlePopup = null;
		}
	}

	private registerTitleEnterHandler(): void {
		this.registerDomEvent(
			DOC,
			"keydown",
			(evt: KeyboardEvent) => {
				this.handleTitleEnter(evt);
			},
			{ capture: true }
		);
	}

	private handleTitleEnter(evt: KeyboardEvent): void {
		if (evt.key !== "Enter" || !this.titlePopup) return;

		const activeEl = DOC.activeElement as HTMLElement | null;
		if (!activeEl) return;

		const focusInTitle = this.isTitleInputElement(activeEl);
		const focusInPopup = this.titlePopup.containerEl.contains(activeEl);
		if (!focusInTitle && !focusInPopup) return;

		evt.preventDefault();
		evt.stopImmediatePropagation();
		this.titlePopup.onSelect?.(this.titlePopup.selectedDate, this.titlePopup.selectedFormat);
	}

	private setTitleCursor(target: HTMLElement, offset: number): void {
		const selection = window.getSelection();
		const textNode = target.firstChild;
		if (!selection || !textNode) return;

		const newRange = DOC.createRange();
		newRange.setStart(textNode, Math.min(offset, textNode.textContent?.length ?? 0));
		newRange.collapse(true);
		selection.removeAllRanges();
		selection.addRange(newRange);
	}

	private dispatchTitleInput(target: HTMLElement, text: string): void {
		this.isDispatchingTitleInput = true;
		try {
			target.dispatchEvent(new InputEvent("input", {
				bubbles: true,
				cancelable: false,
				inputType: "insertText",
				data: text,
			}));
		} catch {
			target.dispatchEvent(new Event("input", { bubbles: true }));
		} finally {
			this.isDispatchingTitleInput = false;
		}
	}
}
