import { FormatTemplate } from "./types";
import { formatDate } from "./format-engine";
import AtDatePickerPlugin from "./main";

interface Coords {
	top: number;
	left: number;
	bottom: number;
}

export class CalendarPopup {
	plugin: AtDatePickerPlugin;
	containerEl: HTMLElement;
	selectedDate: Date;
	currentMonth: Date;
	selectedFormat: FormatTemplate;
	cellEls: HTMLElement[] = [];
	previewEl: HTMLElement;
	formatButtonEls: HTMLElement[] = [];
	onSelect: ((date: Date, format: FormatTemplate) => void) | null = null;
	onCancel: (() => void) | null = null;
	keydownHandler: (e: KeyboardEvent) => void;
	clickOutsideHandler: (e: MouseEvent) => void;
	focusedCellIndex: number = -1;

	constructor(plugin: AtDatePickerPlugin) {
		this.plugin = plugin;
		this.selectedDate = new Date();
		this.selectedDate.setHours(0, 0, 0, 0);
		this.currentMonth = new Date(this.selectedDate);
		this.currentMonth.setDate(1);

		// Determine initial format
		if (plugin.settings.rememberLastFormat && plugin.settings.lastUsedFormat) {
			this.selectedFormat = plugin.settings.lastUsedFormat;
		} else {
			this.selectedFormat = plugin.settings.defaultFormat;
		}

		this.containerEl = this.createDOM();
		this.previewEl = this.containerEl.querySelector(".at-date-preview") as HTMLElement;
		this.updateCalendar();
		this.updatePreview();

		this.keydownHandler = this.handleKeydown.bind(this);
		this.clickOutsideHandler = this.handleClickOutside.bind(this);
	}

	openAtCoords(coords: Coords, focusCalendar = true): void {
		document.body.appendChild(this.containerEl);

		const rect = this.containerEl.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		let left = coords.left;
		let top = coords.bottom + 4;

		// Flip up if not enough space below
		if (top + rect.height > viewportHeight) {
			top = coords.top - rect.height - 4;
		}

		// Clamp to viewport edges
		if (left + rect.width > viewportWidth) {
			left = viewportWidth - rect.width - 8;
		}
		if (left < 8) left = 8;
		if (top < 8) top = 8;

		this.containerEl.style.left = `${left}px`;
		this.containerEl.style.top = `${top}px`;

		// Animation
		this.containerEl.style.opacity = "0";
		this.containerEl.style.transform = "translateY(-4px)";
		requestAnimationFrame(() => {
			this.containerEl.style.transition = "opacity 150ms ease-out, transform 150ms ease-out";
			this.containerEl.style.opacity = "1";
			this.containerEl.style.transform = "translateY(0)";
		});

		document.addEventListener("keydown", this.keydownHandler);
		document.addEventListener("click", this.clickOutsideHandler);
		if (focusCalendar) {
			this.focusDate(this.selectedDate);
		}
	}

	close(): void {
		document.removeEventListener("keydown", this.keydownHandler);
		document.removeEventListener("click", this.clickOutsideHandler);

		this.containerEl.style.transition = "opacity 100ms ease-in, transform 100ms ease-in";
		this.containerEl.style.opacity = "0";
		this.containerEl.style.transform = "translateY(-4px)";

		setTimeout(() => {
			this.containerEl.detach();
		}, 100);
	}

	destroy(): void {
		document.removeEventListener("keydown", this.keydownHandler);
		document.removeEventListener("click", this.clickOutsideHandler);
		this.containerEl.remove();
	}

	private createDOM(): HTMLElement {
		const el = document.createElement("div");
		el.addClass("at-date-popup");
		el.setAttribute("role", "dialog");
		el.setAttribute("aria-modal", "true");

		// Prevent focus from leaving the editor/card input when clicking the calendar.
		// stopPropagation prevents document-level mousedown handlers (e.g. Kanban
		// outside-click detection) from treating the calendar as an external click.
		el.addEventListener("mousedown", (e) => {
			e.preventDefault();
			e.stopPropagation();
		});
		el.addEventListener("mouseup", (e) => {
			e.stopPropagation();
		});
		// Stop click from bubbling to document so outside-click handlers
		// (e.g. Kanban card-add blur logic) don't treat it as an external click.
		el.addEventListener("click", (e) => {
			e.stopPropagation();
		});

		const calendarSection = el.createDiv({ cls: "at-date-calendar-section" });

		// Navigation header
		const nav = calendarSection.createDiv({ cls: "at-date-nav" });
		const prevBtn = nav.createEl("button", {
			text: "<",
			cls: "at-date-nav-btn at-date-nav-prev",
			attr: { tabindex: "-1" },
		});
		const title = nav.createEl("span", { cls: "at-date-nav-title" });
		const nextBtn = nav.createEl("button", {
			text: ">",
			cls: "at-date-nav-btn at-date-nav-next",
			attr: { tabindex: "-1" },
		});

		prevBtn.addEventListener("click", () => this.changeMonth(-1));
		nextBtn.addEventListener("click", () => this.changeMonth(1));

		// Weekday headers
		const weekdayRow = calendarSection.createDiv({ cls: "at-date-weekdays" });
		const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
		for (const day of weekdays) {
			weekdayRow.createEl("span", { text: day, cls: "at-date-weekday" });
		}

		// Calendar grid (42 cells)
		const grid = calendarSection.createDiv({ cls: "at-date-grid" });
		grid.setAttribute("role", "grid");
		for (let i = 0; i < 42; i++) {
			const cell = grid.createEl("button", {
				cls: "at-date-cell",
				attr: { role: "gridcell", tabindex: "-1" },
			});
			cell.addEventListener("click", () => this.handleCellClick(i));
			this.cellEls.push(cell);
		}

		const controlsSection = el.createDiv({ cls: "at-date-controls-section" });

		// Preview area
		const preview = controlsSection.createDiv({ cls: "at-date-preview" });
		preview.setAttribute("aria-live", "polite");
		preview.setAttribute("aria-atomic", "true");
		this.previewEl = preview;

		// Format buttons area
		const formatArea = controlsSection.createDiv({ cls: "at-date-formats" });
		const formats = this.plugin.settings.favoriteFormats.slice(0, 4);
		if (formats.length === 0) {
			const emptyMsg = formatArea.createEl("span", {
				text: "暂无常用格式（最多显示4个） ",
				cls: "at-date-format-empty",
			});
			const settingsLink = emptyMsg.createEl("a", {
				text: "去设置",
				cls: "at-date-format-settings-link",
			});
			settingsLink.addEventListener("click", () => {
				// Obsidian's setting API is not fully typed; cast to any for runtime access
				const appAny = this.plugin.app as any;
				appAny.setting.open();
				appAny.setting.openTabById(this.plugin.manifest.id);
			});
		} else {
			for (let i = 0; i < formats.length; i++) {
				const fmt = formats[i]!;
				const btn = formatArea.createEl("button", {
					text: fmt.name,
					cls: "at-date-format-btn",
					attr: { role: "button", "aria-pressed": "false", tabindex: "-1" },
				});
				if (fmt.name === this.selectedFormat.name) {
					btn.addClass("is-selected");
					btn.setAttribute("aria-pressed", "true");
				}
				btn.addEventListener("click", () => this.selectFormat(fmt));
				this.formatButtonEls.push(btn);
			}
		}

		// Confirm button area
		const confirmArea = controlsSection.createDiv({ cls: "at-date-confirm-area" });
		const confirmBtn = confirmArea.createEl("button", {
			text: "确定",
			cls: "at-date-confirm-btn",
			attr: { tabindex: "-1" },
		});
		confirmArea.createEl("span", {
			text: "或按 Enter",
			cls: "at-date-confirm-hint",
		});
		confirmBtn.addEventListener("click", () => {
			this.onSelect?.(this.selectedDate, this.selectedFormat);
		});

		return el;
	}

	private updateCalendar(): void {
		const year = this.currentMonth.getFullYear();
		const month = this.currentMonth.getMonth();

		const navTitle = this.containerEl.querySelector(".at-date-nav-title");
		if (navTitle) {
			navTitle.textContent = `${year}年${month + 1}月`;
		}

		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startOffset = firstDay.getDay(); // 0 = Sunday

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		for (let i = 0; i < 42; i++) {
			const cell = this.cellEls[i]!;
			const dayIndex = i - startOffset;
			const cellDate = new Date(year, month, dayIndex + 1);
			cellDate.setHours(0, 0, 0, 0);

			cell.empty();
			cell.removeClass(
				"is-today",
				"is-selected",
				"is-other-month",
				"is-disabled"
			);
			cell.setAttribute("aria-selected", "false");

			if (dayIndex < 0 || dayIndex >= daysInMonth) {
				// Other month cells
				const otherMonthDay = cellDate.getDate();
				cell.textContent = String(otherMonthDay);
				cell.addClass("is-other-month");
				// Use onclick to avoid duplicate listeners on cell reuse
				cell.onclick = () => {
					this.currentMonth = new Date(cellDate.getFullYear(), cellDate.getMonth(), 1);
					this.selectDate(cellDate);
				};
			} else {
				cell.textContent = String(dayIndex + 1);
				cell.onclick = () => {
					this.selectDate(cellDate);
				};

				if (cellDate.getTime() === today.getTime()) {
					cell.addClass("is-today");
				}
				if (cellDate.getTime() === this.selectedDate.getTime()) {
					cell.addClass("is-selected");
					cell.setAttribute("aria-selected", "true");
					this.focusedCellIndex = i;
				}
			}
		}
	}

	private updatePreview(): void {
		if (!this.previewEl) return;
		const text = formatDate(this.selectedDate, this.selectedFormat);
		this.previewEl.textContent = `预览: ${text}`;
	}

	private changeMonth(delta: number): void {
		this.currentMonth.setMonth(this.currentMonth.getMonth() + delta);
		this.updateCalendar();
	}

	private selectDate(date: Date): void {
		this.selectedDate = date;
		this.updateCalendar();
		this.updatePreview();
	}

	private selectFormat(format: FormatTemplate): void {
		this.selectedFormat = format;
		for (const btn of this.formatButtonEls) {
			btn.removeClass("is-selected");
			btn.setAttribute("aria-pressed", "false");
		}
		const index = this.plugin.settings.favoriteFormats.indexOf(format);
		if (index >= 0 && index < this.formatButtonEls.length) {
			this.formatButtonEls[index]!.addClass("is-selected");
			this.formatButtonEls[index]!.setAttribute("aria-pressed", "true");
		}
		this.updatePreview();

		// Flash animation
		this.previewEl.style.transition = "opacity 100ms ease";
		this.previewEl.style.opacity = "0.5";
		setTimeout(() => {
			this.previewEl.style.opacity = "1";
		}, 100);
	}

	private handleCellClick(_index: number): void {
		// This is handled by the event listener set in updateCalendar
	}

	private focusDate(date: Date): void {
		const year = this.currentMonth.getFullYear();
		const month = this.currentMonth.getMonth();
		const firstDay = new Date(year, month, 1);
		const startOffset = firstDay.getDay();
		const dayIndex = date.getDate() - 1;
		const cellIndex = startOffset + dayIndex;
		if (cellIndex >= 0 && cellIndex < 42) {
			this.focusedCellIndex = cellIndex;
			this.cellEls[cellIndex]!.focus();
		}
	}

	private handleKeydown(e: KeyboardEvent): void {
		if (!this.containerEl.contains(document.activeElement)) {
			return;
		}

		if (e.key === "Escape") {
			e.preventDefault();
			this.close();
			this.onCancel?.();
			return;
		}

		if (e.key === "Enter") {
			e.preventDefault();
			e.stopPropagation();
			this.onSelect?.(this.selectedDate, this.selectedFormat);
			return;
		}

		if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End"].includes(e.key)) {
			e.preventDefault();
			this.navigateCalendar(e.key);
			return;
		}
	}

	private navigateCalendar(key: string): void {
		const newDate = new Date(this.selectedDate);

		switch (key) {
			case "ArrowUp":
				newDate.setDate(newDate.getDate() - 7);
				break;
			case "ArrowDown":
				newDate.setDate(newDate.getDate() + 7);
				break;
			case "ArrowLeft":
				newDate.setDate(newDate.getDate() - 1);
				break;
			case "ArrowRight":
				newDate.setDate(newDate.getDate() + 1);
				break;
			case "PageUp":
				newDate.setMonth(newDate.getMonth() - 1);
				break;
			case "PageDown":
				newDate.setMonth(newDate.getMonth() + 1);
				break;
			case "Home":
				newDate.setDate(1);
				break;
			case "End":
				newDate.setDate(new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate());
				break;
		}

		// If navigating to a different month, switch view
		if (newDate.getMonth() !== this.currentMonth.getMonth() ||
			newDate.getFullYear() !== this.currentMonth.getFullYear()) {
			this.currentMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
			this.updateCalendar();
		}

		this.selectDate(newDate);
		this.focusDate(newDate);
	}

	private handleClickOutside(e: MouseEvent): void {
		if (!this.containerEl.contains(e.target as Node)) {
			this.close();
			this.onCancel?.();
		}
	}
}
