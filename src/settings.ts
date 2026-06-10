import { App, PluginSettingTab, Setting, Notice, TextComponent } from "obsidian";
import AtDatePickerPlugin from "./main";
import { FormatTemplate } from "./types";
import { validateTemplate, formatDate } from "./format-engine";
import { t } from "./i18n";

const RECOMMENDED_FORMATS = [
	"YYYY-MM-DD",
	"YYYY/MM/DD",
	"YYYY.MM.DD",
	"YYYY年MM月DD日",
	"YYMMDD",
	"MM/DD/YYYY",
	"DD/MM/YYYY",
	"MMM D, YYYY",
	"MMMM D, YYYY",
];

export class AtDateSettingTab extends PluginSettingTab {
	plugin: AtDatePickerPlugin;

	constructor(app: App, plugin: AtDatePickerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl).setName(t("settingTitle")).setHeading();

		// Trigger character
		new Setting(containerEl)
			.setName(t("triggerChar"))
			.setDesc(t("triggerCharDesc"))
			.addText((text) =>
				text
					.setValue(this.plugin.settings.triggerChar)
					.onChange((value) => {
						if (!value || value.length === 0) {
							new Notice(t("triggerCharEmpty"));
							return;
						}
						this.plugin.settings.triggerChar = value;
						void this.plugin.saveSettings();
					})
			);

		// Remember last format
		new Setting(containerEl)
			.setName(t("rememberLastFormat"))
			.setDesc(t("rememberLastFormatDesc"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.rememberLastFormat)
					.onChange((value) => {
						this.plugin.settings.rememberLastFormat = value;
						void this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName(t("defaultFormat")).setHeading();
		this.renderFormatEditor(containerEl, this.plugin.settings.defaultFormat, true);

		new Setting(containerEl).setName(t("favoriteFormats")).setHeading();
		const formatListContainer = containerEl.createDiv({ cls: "atd-format-list" });
		this.renderFormatList(formatListContainer);

		// Add new format button
		new Setting(containerEl)
			.addButton((btn) =>
				btn
					.setButtonText(t("addFormat"))
					.onClick(() => {
						this.plugin.settings.favoriteFormats.push({
							name: t("newFormat"),
							dateFormat: "YYYY-MM-DD",
							prefix: "",
							suffix: "",
						});
						void this.plugin.saveSettings();
						this.display();
					})
			);
	}

	private renderFormatEditor(
		container: HTMLElement,
		format: FormatTemplate,
		isDefault: boolean
	): void {
		const previewEl = container.createDiv({ cls: "atd-format-preview" });
		previewEl.createEl("span", { text: t("preview") });
		const previewValue = previewEl.createEl("span", { cls: "atd-format-preview-value" });

		const updatePreview = () => {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const text = formatDate(today, format);
			previewValue.textContent = text;
			if (!validateTemplate(format.dateFormat)) {
				previewValue.addClass("is-invalid");
				previewValue.textContent = t("invalidFormat");
			} else {
				previewValue.removeClass("is-invalid");
			}
		};

		new Setting(container)
			.setName(t("formatName"))
			.addText((text) =>
				text.setValue(format.name).onChange((value) => {
					format.name = value;
					void this.plugin.saveSettings();
				})
			);

		const dateFormatSetting = new Setting(container)
			.setName(t("dateFormat"))
			.setDesc(t("dateFormatDesc"));
		dateFormatSetting.addText((text) =>
			this.attachFormatDropdown(text, format.dateFormat, (value) => {
				format.dateFormat = value;
				void this.plugin.saveSettings();
				updatePreview();
			})
		);

		new Setting(container)
			.setName(t("prefix"))
			.addText((text) =>
				text.setValue(format.prefix).onChange((value) => {
					format.prefix = value;
					void this.plugin.saveSettings();
					updatePreview();
				})
			);

		new Setting(container)
			.setName(t("suffix"))
			.addText((text) =>
				text.setValue(format.suffix).onChange((value) => {
					format.suffix = value;
					void this.plugin.saveSettings();
					updatePreview();
				})
			);

		updatePreview();
	}

	private renderFormatList(container: HTMLElement): void {
		container.empty();

		if (this.plugin.settings.favoriteFormats.length === 0) {
			container.createEl("p", {
				text: t("noFormats"),
				cls: "setting-item-description",
			});
			return;
		}

		for (let i = 0; i < this.plugin.settings.favoriteFormats.length; i++) {
			const format = this.plugin.settings.favoriteFormats[i];
			if (!format) continue;
			const formatEl = container.createDiv({ cls: "atd-format-item" });

			// Header with name and delete button
			const header = formatEl.createDiv({ cls: "atd-format-item-header" });
			const headerNameEl = header.createEl("span", { text: format.name, cls: "atd-format-item-name" });

			if (i > 0) {
				header.createEl("button", {
					text: t("moveUp"),
					cls: "atd-format-item-btn",
				}).addEventListener("click", async () => {
					const formats = this.plugin.settings.favoriteFormats;
					const curr = formats[i];
					const prev = formats[i - 1];
					if (curr && prev) {
						formats[i] = prev;
						formats[i - 1] = curr;
						await this.plugin.saveSettings();
						this.display();
					}
				});
			}

			if (i < this.plugin.settings.favoriteFormats.length - 1) {
				header.createEl("button", {
					text: t("moveDown"),
					cls: "atd-format-item-btn",
				}).addEventListener("click", async () => {
					const formats = this.plugin.settings.favoriteFormats;
					const curr = formats[i];
					const next = formats[i + 1];
					if (curr && next) {
						formats[i] = next;
						formats[i + 1] = curr;
						await this.plugin.saveSettings();
						this.display();
					}
				});
			}

			header.createEl("button", {
				text: t("delete"),
				cls: "atd-format-item-btn atd-format-item-delete",
			}).addEventListener("click", async () => {
				this.plugin.settings.favoriteFormats.splice(i, 1);
				await this.plugin.saveSettings();
				this.display();
			});

			// Inline editor
			new Setting(formatEl)
				.setName(t("formatName"))
				.addText((text) =>
					text.setValue(format.name).onChange((value) => {
						format.name = value;
						headerNameEl.textContent = value;
						void this.plugin.saveSettings();
					})
				);

			new Setting(formatEl)
				.setName(t("dateFormat"))
				.addText((text) =>
					this.attachFormatDropdown(text, format.dateFormat, (value) => {
						format.dateFormat = value;
						void this.plugin.saveSettings();
					})
				);

			new Setting(formatEl)
				.setName(t("prefix"))
				.addText((text) =>
					text.setValue(format.prefix).onChange((value) => {
						format.prefix = value;
						void this.plugin.saveSettings();
					})
				);

			new Setting(formatEl)
				.setName(t("suffix"))
				.addText((text) =>
					text.setValue(format.suffix).onChange((value) => {
						format.suffix = value;
						void this.plugin.saveSettings();
					})
				);
		}
	}

	private attachFormatDropdown(
		text: TextComponent,
		initialValue: string,
		onChange: (value: string) => void
	): void {
		const controlEl = text.inputEl.parentElement!;
		controlEl.addClass("atd-format-input-wrap");

		const dropdownEl = controlEl.createDiv({ cls: "atd-format-dropdown" });

		for (const item of RECOMMENDED_FORMATS) {
			const itemEl = dropdownEl.createDiv({ cls: "atd-format-dropdown-item" });
			itemEl.createEl("span", { cls: "atd-format-dropdown-label", text: item });

			itemEl.addEventListener("mousedown", (e) => {
				// Prevent input from losing focus so blur doesn't hide dropdown before click fires
				e.preventDefault();
			});

			itemEl.addEventListener("click", () => {
				text.setValue(item);
				onChange(item);
				dropdownEl.removeClass("is-visible");
			});
		}

		text.inputEl.addEventListener("focus", () => {
			dropdownEl.addClass("is-visible");
		});

		text.inputEl.addEventListener("blur", () => {
			window.setTimeout(() => {
				dropdownEl.removeClass("is-visible");
			}, 150);
		});

		text.inputEl.addEventListener("keydown", (e) => {
			if (e.key === "Escape") {
				dropdownEl.removeClass("is-visible");
			}
		});

		text.setValue(initialValue).onChange(onChange);
	}
}
