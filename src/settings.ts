import { App, Notice, PluginSettingTab, Setting, SettingDefinitionItem, TextComponent } from "obsidian";
import AtDatePickerPlugin from "./main";
import { FormatTemplate, WeekdayFormat } from "./types";
import { validateTemplate, formatDate, formatOptionsFromSettings } from "./format-engine";
import { t, syncWeekdayDefaultsForLocale, getLocaleWeekdayDefaults } from "./i18n";

function formatsEqual(a: FormatTemplate, b: FormatTemplate): boolean {
	return (
		a.name === b.name &&
		a.dateFormat === b.dateFormat &&
		a.prefix === b.prefix &&
		a.suffix === b.suffix &&
		(a.weekdayFormat ?? "") === (b.weekdayFormat ?? "") &&
		(a.weekdayArrangement ?? "") === (b.weekdayArrangement ?? "")
	);
}

function cloneFormat(format: FormatTemplate): FormatTemplate {
	return {
		name: format.name,
		dateFormat: format.dateFormat,
		prefix: format.prefix,
		suffix: format.suffix,
		weekdayFormat: format.weekdayFormat,
		weekdayArrangement: format.weekdayArrangement,
	};
}

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

const WEEKDAY_OPTIONS: Record<WeekdayFormat, () => string> = {
	chinese: () => t("weekdayChinese"),
	short: () => t("weekdayShort"),
	english: () => t("weekdayEnglish"),
	englishShort: () => t("weekdayEnglishShort"),
};

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
				type: "group",
				heading: t("defaultFormat"),
				items: [
					{
						name: t("defaultFormat"),
						searchable: false,
						render: (setting) => {
							const host = this.prepareBlockHost(setting, "atd-format-editor-host");
							const help = host.createDiv({ cls: "atd-format-section-help" });
							help.createDiv({
								cls: "atd-format-section-help-line",
								text: t("defaultFormatHelpTokens"),
							});
							help.createDiv({
								cls: "atd-format-section-help-line",
								text: t("defaultFormatHelpAffix"),
							});
							help.createDiv({
								cls: "atd-format-section-help-line",
								text: t("defaultFormatHelpWeekday"),
							});
							const body = host.createDiv({ cls: "atd-format-editor-body" });
							this.renderFormatEditor(body, this.plugin.settings.defaultFormat);
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
							const host = this.prepareBlockHost(setting, "atd-format-list-host");
							const list = host.createDiv({ cls: "atd-format-list" });
							this.renderFormatList(list);
						},
					},
					{
						// Empty name avoids a duplicate left-side label next to the button.
						name: "",
						searchable: false,
						render: (setting) => {
							setting.clear();
							setting.addButton((btn) =>
								btn.setButtonText(t("addFormat")).onClick(() => {
									const defaults = getLocaleWeekdayDefaults();
									this.plugin.settings.favoriteFormats.push({
										name: t("newFormat"),
										dateFormat: "YYYY-MM-DD",
										prefix: "",
										suffix: "",
										weekdayFormat:
											this.plugin.settings.weekdayFormat ??
											defaults.weekdayFormat,
										weekdayArrangement:
											this.plugin.settings.weekdayArrangement ||
											defaults.weekdayArrangement,
									});
									void this.plugin.saveSettings();
									this.update();
								})
							);
						},
					},
				],
			},
		];
	}

	/**
	 * Keep the framework-owned setting row in the DOM (removing it breaks
	 * re-renders / actions), but restyle it as a vertical block host so nested
	 * Setting rows are not crushed into a horizontal flex line.
	 */
	private prepareBlockHost(setting: Setting, cls: string): HTMLElement {
		const host = setting.settingEl;
		host.empty();
		host.addClass("atd-setting-block-host");
		host.addClass(cls);
		return host;
	}

	private renderFormatEditor(container: HTMLElement, format: FormatTemplate): void {
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

		this.renderFormatFields(container, format, {
			onPreviewUpdate: updatePreview,
		});

		updatePreview();
	}

	/**
	 * Two-column field layout:
	 * row1 = name | date format, row2 = prefix | suffix.
	 * When includeWeekday is on, a weekday dropdown is rendered below the grid.
	 */
	private renderFormatFields(
		container: HTMLElement,
		format: FormatTemplate,
		options: {
			onNameChange?: (value: string) => void;
			onPreviewUpdate: () => void;
		}
	): void {
		const fields = container.createDiv({ cls: "atd-format-fields" });
		const nameDateRow = fields.createDiv({ cls: "atd-format-fields-row" });

		new Setting(nameDateRow)
			.setName(t("formatName"))
			.addText((text) =>
				text.setValue(format.name).onChange((value) => {
					format.name = value;
					options.onNameChange?.(value);
					void this.plugin.saveSettings();
				})
			);

		new Setting(nameDateRow)
			.setName(t("dateFormat"))
			.addText((text) =>
				this.attachFormatDropdown(text, format.dateFormat, (value) => {
					format.dateFormat = value;
					void this.plugin.saveSettings();
					options.onPreviewUpdate();
				})
			);

		const prefixSuffixRow = fields.createDiv({ cls: "atd-format-fields-row" });

		new Setting(prefixSuffixRow)
			.setName(t("prefix"))
			.addText((text) =>
				text.setValue(format.prefix).onChange((value) => {
					format.prefix = value;
					void this.plugin.saveSettings();
					options.onPreviewUpdate();
				})
			);

		new Setting(prefixSuffixRow)
			.setName(t("suffix"))
			.addText((text) =>
				text.setValue(format.suffix).onChange((value) => {
					format.suffix = value;
					void this.plugin.saveSettings();
					options.onPreviewUpdate();
				})
			);

		if (this.plugin.settings.includeWeekday) {
			const defaults = getLocaleWeekdayDefaults();
			if (!format.weekdayFormat) {
				format.weekdayFormat =
					this.plugin.settings.weekdayFormat ?? defaults.weekdayFormat;
			}
			if (!format.weekdayArrangement) {
				format.weekdayArrangement =
					this.plugin.settings.weekdayArrangement || defaults.weekdayArrangement;
			}

			const weekdayWrap = container.createDiv({ cls: "atd-format-weekday" });

			new Setting(weekdayWrap)
				.setName(t("weekdayFormat"))
				.addDropdown((dropdown) => {
					for (const [value, label] of Object.entries(WEEKDAY_OPTIONS)) {
						dropdown.addOption(value, label());
					}
					dropdown.setValue(format.weekdayFormat ?? "chinese");
					dropdown.onChange((value) => {
						format.weekdayFormat = value as WeekdayFormat;
						void this.plugin.saveSettings();
						options.onPreviewUpdate();
					});
				});

			new Setting(weekdayWrap)
				.setName(t("weekdayArrangement"))
				.addText((text) =>
					text
						.setPlaceholder(t("weekdayArrangementPlaceholder"))
						.setValue(format.weekdayArrangement ?? "")
						.onChange((value) => {
							format.weekdayArrangement = value;
							void this.plugin.saveSettings();
							options.onPreviewUpdate();
						})
				);
		}
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
			const isDefault = formatsEqual(format, this.plugin.settings.defaultFormat);

			// Only updates defaultFormat — does not touch rememberLastFormat / lastUsedFormat.
			const setDefaultBtn = header.createEl("button", {
				text: isDefault ? t("isDefault") : t("setAsDefault"),
				cls: isDefault
					? "atd-format-item-btn atd-format-item-is-default"
					: "atd-format-item-btn atd-format-item-set-default",
			});
			if (isDefault) {
				setDefaultBtn.disabled = true;
			} else {
				setDefaultBtn.addEventListener("click", () => {
					this.plugin.settings.defaultFormat = cloneFormat(format);
					void this.plugin.saveSettings();
					new Notice(t("setAsDefaultDone"));
					this.update();
				});
			}

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

			this.renderFormatFields(formatEl, format, {
				onNameChange: (value) => {
					headerNameEl.textContent = value;
				},
				onPreviewUpdate: updateFavoritePreview,
			});

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
