import { App, PluginSettingTab, Setting, SettingDefinitionItem, TextComponent } from "obsidian";
import AtDatePickerPlugin from "./main";
import { FormatTemplate } from "./types";
import { validateTemplate, formatDate, formatOptionsFromSettings } from "./format-engine";
import { t, syncWeekdayDefaultsForLocale } from "./i18n";

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

	getSettingDefinitions(): SettingDefinitionItem[] {
		if (syncWeekdayDefaultsForLocale(this.plugin.settings)) {
			void this.plugin.saveSettings();
		}

		return [
			{
				name: t("triggerChar"),
				desc: t("triggerCharDesc"),
				control: {
					type: "text",
					key: "triggerChar",
					validate: (value: string) =>
						value.length === 0 ? t("triggerCharEmpty") : undefined,
				},
			},
			{
				name: t("rememberLastFormat"),
				desc: t("rememberLastFormatDesc"),
				control: {
					type: "toggle",
					key: "rememberLastFormat",
				},
			},
			{
				name: t("includeWeekday"),
				desc: t("includeWeekdayDesc"),
				control: {
					type: "toggle",
					key: "includeWeekday",
				},
			},
			{
				name: t("weekdayFormat"),
				desc: t("weekdayFormatDesc"),
				visible: () => this.plugin.settings.includeWeekday,
				control: {
					type: "dropdown",
					key: "weekdayFormat",
					options: {
						chinese: t("weekdayChinese"),
						short: t("weekdayShort"),
						english: t("weekdayEnglish"),
						englishShort: t("weekdayEnglishShort"),
					},
				},
			},
			{
				name: t("weekdayArrangement"),
				desc: t("weekdayArrangementDesc"),
				visible: () => this.plugin.settings.includeWeekday,
				control: {
					type: "text",
					key: "weekdayArrangement",
					placeholder: t("weekdayArrangementPlaceholder"),
				},
			},
			{
				type: "group",
				heading: t("defaultFormat"),
				items: [
					{
						name: t("defaultFormat"),
						searchable: false,
						render: (setting) => {
							setting.settingEl.empty();
							this.renderFormatEditor(
								setting.settingEl,
								this.plugin.settings.defaultFormat,
								true
							);
						},
					},
				],
			},
			{
				type: "group",
				heading: t("favoriteFormats"),
				items: [
					{
						name: t("favoriteFormats"),
						searchable: false,
						render: (setting) => {
							setting.settingEl.empty();
							const list = setting.settingEl.createDiv({ cls: "atd-format-list" });
							this.renderFormatList(list);
						},
					},
					{
						name: t("addFormat"),
						action: () => {
							this.plugin.settings.favoriteFormats.push({
								name: t("newFormat"),
								dateFormat: "YYYY-MM-DD",
								prefix: "",
								suffix: "",
							});
							void this.plugin.saveSettings();
							this.update();
						},
					},
				],
			},
		];
	}

	private renderFormatEditor(
		container: HTMLElement,
		format: FormatTemplate,
		_isDefault: boolean
	): void {
		const previewEl = container.createDiv({ cls: "atd-format-preview" });
		previewEl.createSpan({ text: t("preview") });
		const previewValue = previewEl.createSpan({ cls: "atd-format-preview-value" });

		const updatePreview = () => {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const text = formatDate(today, format, formatOptionsFromSettings(this.plugin.settings));
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

			const header = formatEl.createDiv({ cls: "atd-format-item-header" });
			const headerNameEl = header.createSpan({ text: format.name, cls: "atd-format-item-name" });

			if (i > 0) {
				header.createEl("button", {
					text: t("moveUp"),
					cls: "atd-format-item-btn",
				}).addEventListener("click", () => {
					const formats = this.plugin.settings.favoriteFormats;
					const curr = formats[i];
					const prev = formats[i - 1];
					if (curr && prev) {
						formats[i] = prev;
						formats[i - 1] = curr;
						void this.plugin.saveSettings();
						this.update();
					}
				});
			}

			if (i < this.plugin.settings.favoriteFormats.length - 1) {
				header.createEl("button", {
					text: t("moveDown"),
					cls: "atd-format-item-btn",
				}).addEventListener("click", () => {
					const formats = this.plugin.settings.favoriteFormats;
					const curr = formats[i];
					const next = formats[i + 1];
					if (curr && next) {
						formats[i] = next;
						formats[i + 1] = curr;
						void this.plugin.saveSettings();
						this.update();
					}
				});
			}

			header.createEl("button", {
				text: t("delete"),
				cls: "atd-format-item-btn atd-format-item-delete",
			}).addEventListener("click", () => {
				this.plugin.settings.favoriteFormats.splice(i, 1);
				void this.plugin.saveSettings();
				this.update();
			});

			const favoritePreview = formatEl.createDiv({ cls: "atd-format-preview" });
			favoritePreview.createSpan({ text: t("preview") });
			const favoritePreviewValue = favoritePreview.createSpan({
				cls: "atd-format-preview-value",
			});
			const updateFavoritePreview = () => {
				const today = new Date();
				today.setHours(0, 0, 0, 0);
				favoritePreviewValue.textContent = formatDate(
					today,
					format,
					formatOptionsFromSettings(this.plugin.settings)
				);
			};

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
						updateFavoritePreview();
					})
				);

			new Setting(formatEl)
				.setName(t("prefix"))
				.addText((text) =>
					text.setValue(format.prefix).onChange((value) => {
						format.prefix = value;
						void this.plugin.saveSettings();
						updateFavoritePreview();
					})
				);

			new Setting(formatEl)
				.setName(t("suffix"))
				.addText((text) =>
					text.setValue(format.suffix).onChange((value) => {
						format.suffix = value;
						void this.plugin.saveSettings();
						updateFavoritePreview();
					})
				);

			updateFavoritePreview();
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
			itemEl.createSpan({ cls: "atd-format-dropdown-label", text: item });

			itemEl.addEventListener("mousedown", (e) => {
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
