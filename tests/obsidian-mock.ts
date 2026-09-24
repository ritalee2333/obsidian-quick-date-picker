// Minimal mocks for Obsidian APIs used in tests

export class Notice {
	message: string;
	constructor(message: string) {
		this.message = message;
	}
}

export class PluginSettingTab {
	app: any;
	plugin: any;
	containerEl: HTMLElement;
	constructor(app: any, plugin: any) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = document.createElement("div");
	}
	display(): void {}
	update(): void {}
	getSettingDefinitions(): unknown[] {
		return [];
	}
}

class MockSettingInstance {
	container: HTMLElement;
	nameEl?: HTMLElement;
	descEl?: HTMLElement;

	constructor(containerEl: HTMLElement) {
		this.container = containerEl.createDiv({ cls: "setting-item" });
	}

	setName(name: string) {
		this.container.createEl("div", { text: name, cls: "setting-item-name" });
		return this;
	}

	setDesc(desc: string) {
		this.container.createEl("div", { text: desc, cls: "setting-item-description" });
		return this;
	}

	addText(cb: (text: any) => any) {
		const input = document.createElement("input");
		input.type = "text";
		this.container.appendChild(input);
		const textComp = {
			inputEl: input,
			setPlaceholder: (v: string) => { input.placeholder = v; return textComp; },
			setValue: (v: string) => { input.value = v; return textComp; },
			onChange: (fn: (v: string) => void) => {
				input.addEventListener("input", () => fn(input.value));
				return textComp;
			},
		};
		cb(textComp);
		return this;
	}

	addToggle(cb: (toggle: any) => any) {
		const input = document.createElement("input");
		input.type = "checkbox";
		this.container.appendChild(input);
		const toggleComp = {
			setValue: (v: boolean) => { input.checked = v; return toggleComp; },
			onChange: (fn: (v: boolean) => void) => {
				input.addEventListener("change", () => fn(input.checked));
				return toggleComp;
			},
		};
		cb(toggleComp);
		return this;
	}

	addButton(cb: (btn: any) => any) {
		const btn = document.createElement("button");
		this.container.appendChild(btn);
		const btnComp = {
			setButtonText: (t: string) => { btn.textContent = t; return btnComp; },
			onClick: (fn: () => void) => { btn.addEventListener("click", fn); return btnComp; },
		};
		cb(btnComp);
		return this;
	}

	addDropdown(cb: (dropdown: any) => any) {
		const select = document.createElement("select");
		this.container.appendChild(select);
		const dropdownComp = {
			addOption: (value: string, label: string) => {
				const option = document.createElement("option");
				option.value = value;
				option.textContent = label;
				select.appendChild(option);
				return dropdownComp;
			},
			setValue: (v: string) => { select.value = v; return dropdownComp; },
			onChange: (fn: (v: string) => void) => {
				select.addEventListener("change", () => fn(select.value));
				return dropdownComp;
			},
		};
		cb(dropdownComp);
		return this;
	}
}

export class Setting {
	instance: MockSettingInstance;
	settingEl: HTMLElement;
	constructor(containerEl: HTMLElement) {
		this.instance = new MockSettingInstance(containerEl);
		this.settingEl = this.instance.container;
	}
	setName(name: string) { this.instance.setName(name); return this; }
	setDesc(desc: string) { this.instance.setDesc(desc); return this; }
	setHeading() {
		this.settingEl.classList.add("setting-item-heading");
		return this;
	}
	addText(cb: (text: any) => any) { this.instance.addText(cb); return this; }
	addToggle(cb: (toggle: any) => any) { this.instance.addToggle(cb); return this; }
	addButton(cb: (btn: any) => any) { this.instance.addButton(cb); return this; }
	addDropdown(cb: (dropdown: any) => any) { this.instance.addDropdown(cb); return this; }
	clear() {
		this.settingEl.empty();
		return this;
	}
	get container() { return this.instance.container; }
}
