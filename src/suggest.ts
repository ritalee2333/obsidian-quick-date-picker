import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	TFile,
} from "obsidian";
import AtDatePickerPlugin from "./main";
import { isRelativeDateInput, parseRelativeDate } from "./relative-date";
import { formatDate } from "./format-engine";
import { CalendarPopup } from "./calendar-popup";

/** Popout-window compatible document reference */
const DOC: Document = typeof activeDocument !== "undefined" ? activeDocument : window.document;

interface EditorWithCoords extends Editor {
	coordsAtPos: (pos: EditorPosition) => { top: number; left: number; bottom: number } | null;
}

interface WorkspaceWithActiveEditor {
	activeEditor?: {
		editor: Editor;
	};
}

export class AtDateEditorSuggest extends EditorSuggest<string> {
	plugin: AtDatePickerPlugin;
	popup: CalendarPopup | null = null;
	private appRef: App;
	private isComposing = false;
	private compositionEndTimer: number | null = null;
	private activeQuery = "";

	constructor(app: App, plugin: AtDatePickerPlugin) {
		super(app);
		this.appRef = app;
		this.plugin = plugin;
		this.plugin.registerDomEvent(DOC, "compositionstart", () => {
			this.isComposing = true;
		});
		this.plugin.registerDomEvent(DOC, "compositionend", () => {
			if (this.compositionEndTimer) {
				window.clearTimeout(this.compositionEndTimer);
			}
			this.compositionEndTimer = window.setTimeout(() => {
				this.replaceRelativeDateAtCursor(true);
				this.isComposing = false;
				this.compositionEndTimer = null;
			}, 50);
		});
		// Use capture phase on window so we intercept Enter before any plugin
		// (Kanban, CodeMirror keymap, etc.) handles it.
		this.plugin.registerDomEvent(
			window,
			"keydown",
			(evt: KeyboardEvent) => {
				this.handleEditorEnter(evt);
			},
			{ capture: true }
		);
	}

	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		file: TFile
	): EditorSuggestTriggerInfo | null {
		if (this.isComposing) return null;

		const trigger = this.plugin.settings.triggerChar;
		const line = editor.getLine(cursor.line);
		const beforeCursor = line.slice(0, cursor.ch);
		const triggerIndex = beforeCursor.lastIndexOf(trigger);

		if (triggerIndex === -1) return null;

		const rawQuery = beforeCursor.slice(triggerIndex + trigger.length);
		const query = rawQuery.trimStart();

		if (!this.shouldKeepPopupForQuery(query)) {
			this.closePopup();
			return null;
		}

		// Check context: don't trigger in code blocks, inline code, frontmatter, links
		if (this.isInBlockedContext(editor, cursor.line, triggerIndex, beforeCursor)) {
			return null;
		}

		// Adjust end position to consume trailing whitespace for clean replacement
		const trailingSpaces = rawQuery.length - rawQuery.trimEnd().length;
		const end: EditorPosition = { line: cursor.line, ch: cursor.ch + trailingSpaces };
		const start: EditorPosition = { line: cursor.line, ch: triggerIndex };

		return { start, end, query };
	}

	getSuggestions(context: EditorSuggestContext): string[] {
		this.activeQuery = context.query;

		// Close any existing popup first (trigger dedup)
		if (this.popup) {
			this.popup.destroy();
			this.popup = null;
		}

		// Relative date: @+3d, @-1w, etc. — direct insert, no popup
		const relative = parseRelativeDate(context.query);
		if (relative) {
			const template = this.plugin.settings.lastUsedFormat ??
				this.plugin.settings.defaultFormat;
			const text = formatDate(relative.date, template);
			context.editor.replaceRange(text, context.start, context.end);
			context.editor.setCursor({
				line: context.start.line,
				ch: context.start.ch + text.length,
			});
			this.plugin.settings.lastUsedFormat = template;
			void this.plugin.saveSettings();
			this.activeQuery = "";
			return [];
		}

		// Show calendar popup
		this.popup = new CalendarPopup(this.plugin);
		this.popup.onSelect = (date, format) => {
			const text = formatDate(date, format);
			context.editor.replaceRange(text, context.start, context.end);
			context.editor.setCursor({
				line: context.start.line,
				ch: context.start.ch + text.length,
			});
			if (this.plugin.settings.rememberLastFormat) {
				this.plugin.settings.lastUsedFormat = format;
				void this.plugin.saveSettings();
			}
			// Restore focus before destroying popup so the cursor doesn't vanish
			// when the focused button element is removed from the DOM.
			context.editor.focus();
			this.closePopup();
		};
		this.popup.onCancel = () => {
			this.closePopup();
		};

		// Position popup below cursor
		// Obsidian Editor.coordsAtPos exists at runtime but is missing from typings
		const coords = (context.editor as EditorWithCoords).coordsAtPos(context.end);
		if (coords) {
			this.popup.openAtCoords(coords, false);
		}

		// Close the native suggest UI so user can keep typing in the editor.
		// We must defer so Obsidian finishes opening the panel before we close it,
		// then manually refocus the editor because Obsidian doesn't restore focus
		// automatically when the panel is dismissed programmatically.
		window.setTimeout(() => {
			this.close();
			context.editor.focus();
		}, 50);

		// Return empty to suppress default suggest list
		return [];
	}

	renderSuggestion(_value: string, _el: HTMLElement): void {
		// Intentionally empty — we use custom DOM popup
	}

	selectSuggestion(_value: string, _evt: MouseEvent | KeyboardEvent): void {
		// Handled by popup
	}

	destroy(): void {
		if (this.compositionEndTimer) {
			window.clearTimeout(this.compositionEndTimer);
			this.compositionEndTimer = null;
		}
		this.closePopup();
	}

	closePopup(): void {
		if (this.popup) {
			this.popup.destroy();
			this.popup = null;
		}
		this.activeQuery = "";
	}

	private replaceRelativeDateAtCursor(cleanupImeUnit = false): void {
		const workspace = (this.appRef as { workspace?: WorkspaceWithActiveEditor }).workspace;
		const editor = workspace?.activeEditor?.editor;
		if (!editor) return;

		const cursor = editor.getCursor();
		const trigger = this.plugin.settings.triggerChar;
		const line = editor.getLine(cursor.line);
		const beforeCursor = line.slice(0, cursor.ch);
		const triggerIndex = beforeCursor.lastIndexOf(trigger);
		if (triggerIndex === -1) return;

		const query = beforeCursor.slice(triggerIndex + trigger.length);
		const relative = parseRelativeDate(query);
		if (!relative) return;

		const template = this.plugin.settings.lastUsedFormat ??
			this.plugin.settings.defaultFormat;
		const text = formatDate(relative.date, template);
		const start = { line: cursor.line, ch: triggerIndex };
		const insertedEnd = { line: cursor.line, ch: triggerIndex + text.length };
		editor.replaceRange(
			text,
			start,
			cursor
		);
		editor.setCursor(insertedEnd);
		if (cleanupImeUnit) {
			this.cleanupTrailingImeUnit(editor, insertedEnd, query);
		}
		// Reset IME composition state to prevent trailing character output
		editor.blur();
		editor.focus();
		this.plugin.settings.lastUsedFormat = template;
		void this.plugin.saveSettings();
		this.closePopup();
	}

	private shouldKeepPopupForQuery(query: string): boolean {
		const trimmed = query.trimStart();
		if (trimmed.length === 0) return true;
		if (trimmed.startsWith("+") || trimmed.startsWith("-")) {
			return isRelativeDateInput(trimmed);
		}
		return trimmed.length < 3;
	}

	private handleEditorEnter(evt: KeyboardEvent): void {
		if (
			evt.key !== "Enter" ||
			evt.isComposing ||
			this.isComposing ||
			this.activeQuery.length > 0 ||
			!this.popup ||
			this.popup.containerEl.contains(DOC.activeElement)
		) {
			return;
		}

		evt.preventDefault();
		evt.stopImmediatePropagation();
		this.popup.onSelect?.(this.popup.selectedDate, this.popup.selectedFormat);
	}

	private cleanupTrailingImeUnit(editor: Editor, position: EditorPosition, query: string): void {
		const unit = query.slice(-1).toLowerCase();
		if (!/^[dwmy]$/.test(unit)) return;

		for (const delay of [0, 30, 80, 160]) {
			window.setTimeout(() => {
				const lineText = editor.getLine(position.line);
				let count = 0;
				while (
					count < 2 &&
					lineText[position.ch + count]?.toLowerCase() === unit
				) {
					count++;
				}

				if (count === 0) return;
				editor.replaceRange(
					"",
					position,
					{ line: position.line, ch: position.ch + count }
				);
				editor.setCursor(position);
			}, delay);
		}
	}

	private isInBlockedContext(
		editor: Editor,
		line: number,
		triggerIndex: number,
		beforeCursor: string
	): boolean {
		// Inline code: check if trigger is inside backticks on the same line
		if (this.isInInlineCode(beforeCursor, triggerIndex)) {
			return true;
		}

		// Wiki link: check if trigger is inside [[...]] on the same line
		if (this.isInWikiLink(beforeCursor, triggerIndex)) {
			return true;
		}

		// Markdown link: check if trigger is inside [...](...) on the same line
		if (this.isInMarkdownLink(beforeCursor, triggerIndex)) {
			return true;
		}

		// Code block or frontmatter: scan from document start
		if (this.isInCodeBlockOrFrontmatter(editor, line)) {
			return true;
		}

		return false;
	}

	private isInInlineCode(beforeCursor: string, triggerIndex: number): boolean {
		// Count unescaped backticks before trigger
		const textBeforeTrigger = beforeCursor.slice(0, triggerIndex);
		let backtickCount = 0;
		for (let i = 0; i < textBeforeTrigger.length; i++) {
			if (textBeforeTrigger[i] === "`" && (i === 0 || textBeforeTrigger[i - 1] !== "\\")) {
				backtickCount++;
			}
		}
		// Odd number of backticks means we're inside inline code
		return backtickCount % 2 === 1;
	}

	private isInWikiLink(beforeCursor: string, triggerIndex: number): boolean {
		const textBeforeTrigger = beforeCursor.slice(0, triggerIndex);
		const openCount = (textBeforeTrigger.match(/\[\[/g) || []).length;
		const closeCount = (textBeforeTrigger.match(/\]\]/g) || []).length;
		return openCount > closeCount;
	}

	private isInMarkdownLink(beforeCursor: string, triggerIndex: number): boolean {
		const textBeforeTrigger = beforeCursor.slice(0, triggerIndex);
		// Simple heuristic: inside [...] that hasn't been closed
		let bracketDepth = 0;
		for (let i = 0; i < textBeforeTrigger.length; i++) {
			const ch = textBeforeTrigger[i];
			if (ch === "[" && textBeforeTrigger[i - 1] !== "[") {
				bracketDepth++;
			} else if (ch === "]" && textBeforeTrigger[i + 1] !== "]") {
				bracketDepth--;
			}
		}
		return bracketDepth > 0;
	}

	private isInCodeBlockOrFrontmatter(editor: Editor, currentLine: number): boolean {
		let inFrontmatter = false;
		let inCodeBlock = false;
		let codeBlockFence = "";

		for (let i = 0; i <= currentLine; i++) {
			const lineText = editor.getLine(i);
			const trimmed = lineText.trim();

			// Frontmatter detection
			if (i === 0 && trimmed === "---") {
				inFrontmatter = true;
				continue;
			}
			if (inFrontmatter && trimmed === "---") {
				inFrontmatter = false;
				continue;
			}

			// Code block detection
			if (!inCodeBlock && trimmed.startsWith("```")) {
				inCodeBlock = true;
				codeBlockFence = "```";
				continue;
			}
			if (inCodeBlock && trimmed === codeBlockFence) {
				inCodeBlock = false;
				codeBlockFence = "";
				continue;
			}
		}

		return inFrontmatter || inCodeBlock;
	}
}
