// Polyfill Obsidian's HTMLElement extensions for jsdom testing

// Define activeDocument for popout-window compatibility tests
if (typeof (globalThis as any).activeDocument === "undefined") {
	(globalThis as any).activeDocument = (globalThis as any).document;
}

interface CreateOpts {
	text?: string;
	cls?: string;
	attr?: Record<string, string>;
}

declare global {
	interface HTMLElement {
		addClass(...classes: string[]): void;
		removeClass(...classes: string[]): void;
		hasClass(cls: string): boolean;
		toggleClass(cls: string, force?: boolean): boolean;
		createEl(tag: string, opts?: CreateOpts): HTMLElement;
		createDiv(opts?: CreateOpts): HTMLElement;
		createSpan(opts?: CreateOpts): HTMLElement;
		empty(): void;
		detach(): void;
	}
}

if (!HTMLElement.prototype.addClass) {
	HTMLElement.prototype.addClass = function (...classes: string[]) {
		this.classList.add(...classes);
	};
}

if (!HTMLElement.prototype.removeClass) {
	HTMLElement.prototype.removeClass = function (...classes: string[]) {
		this.classList.remove(...classes);
	};
}

if (!HTMLElement.prototype.hasClass) {
	HTMLElement.prototype.hasClass = function (cls: string) {
		return this.classList.contains(cls);
	};
}

if (!HTMLElement.prototype.toggleClass) {
	HTMLElement.prototype.toggleClass = function (cls: string, force?: boolean) {
		return this.classList.toggle(cls, force);
	};
}

if (!HTMLElement.prototype.createEl) {
	HTMLElement.prototype.createEl = function (tag: string, opts?: CreateOpts) {
		const el = document.createElement(tag);
		if (opts?.text) el.textContent = opts.text;
		if (opts?.cls) el.className = opts.cls;
		if (opts?.attr) {
			for (const [k, v] of Object.entries(opts.attr)) {
				el.setAttribute(k, v);
			}
		}
		this.appendChild(el);
		return el;
	};
}

if (!HTMLElement.prototype.createDiv) {
	HTMLElement.prototype.createDiv = function (opts?: CreateOpts) {
		return this.createEl("div", opts);
	};
}

if (!HTMLElement.prototype.createSpan) {
	HTMLElement.prototype.createSpan = function (opts?: CreateOpts) {
		return this.createEl("span", opts);
	};
}

if (!HTMLElement.prototype.empty) {
	HTMLElement.prototype.empty = function () {
		while (this.firstChild) {
			this.removeChild(this.firstChild);
		}
	};
}

if (!HTMLElement.prototype.detach) {
	HTMLElement.prototype.detach = function () {
		if (this.parentNode) {
			this.parentNode.removeChild(this);
		}
	};
}
