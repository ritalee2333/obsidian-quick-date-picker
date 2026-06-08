import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import AtDatePickerPlugin from "./main";
import { FormatTemplate, DEFAULT_SETTINGS } from "./types";
import { validateTemplate, formatDate } from "./format-engine";

export class AtDateSettingTab extends PluginSettingTab {
	plugin: AtDatePickerPlugin;

	constructor(app: App, plugin: AtDatePickerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Quick Date Picker 设置" });

		// Trigger character
		new Setting(containerEl)
			.setName("触发字符")
			.setDesc("输入此字符后弹出日期选择器（重启 Obsidian 后生效）")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.triggerChar)
					.onChange(async (value) => {
						if (!value || value.length === 0) {
							new Notice("触发字符不能为空");
							return;
						}
						this.plugin.settings.triggerChar = value;
						await this.plugin.saveSettings();
					})
			);

		// Remember last format
		new Setting(containerEl)
			.setName("记住上次使用的格式")
			.setDesc("开启后，弹窗会自动选中你上次使用的格式")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.rememberLastFormat)
					.onChange(async (value) => {
						this.plugin.settings.rememberLastFormat = value;
						await this.plugin.saveSettings();
					})
			);

		containerEl.createEl("h3", { text: "默认格式", cls: "setting-item-heading" });
		this.renderFormatEditor(containerEl, this.plugin.settings.defaultFormat, true);

		containerEl.createEl("h3", { text: "常用格式列表", cls: "setting-item-heading" });
		const formatListContainer = containerEl.createDiv({ cls: "atd-format-list" });
		this.renderFormatList(formatListContainer);

		// Add new format button
		new Setting(containerEl)
			.addButton((btn) =>
				btn
					.setButtonText("+ 添加常用格式")
					.onClick(() => {
						this.plugin.settings.favoriteFormats.push({
							name: "新格式",
							dateFormat: "YYYY-MM-DD",
							prefix: "",
							suffix: "",
						});
						this.plugin.saveSettings();
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
		previewEl.createEl("span", { text: "预览: " });
		const previewValue = previewEl.createEl("span", { cls: "atd-format-preview-value" });

		const updatePreview = () => {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const text = formatDate(today, format);
			previewValue.textContent = text;
			if (!validateTemplate(format.dateFormat)) {
				previewValue.addClass("is-invalid");
				previewValue.textContent = "格式无效（缺少日期标记）";
			} else {
				previewValue.removeClass("is-invalid");
			}
		};

		new Setting(container)
			.setName("格式名称")
			.addText((text) =>
				text.setValue(format.name).onChange(async (value) => {
					format.name = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(container)
			.setName("日期格式")
			.setDesc("支持: YYYY, YY, MM, M, DD, D")
			.addText((text) =>
				text.setValue(format.dateFormat).onChange(async (value) => {
					format.dateFormat = value;
					await this.plugin.saveSettings();
					updatePreview();
				})
			);

		new Setting(container)
			.setName("前缀")
			.addText((text) =>
				text.setValue(format.prefix).onChange(async (value) => {
					format.prefix = value;
					await this.plugin.saveSettings();
					updatePreview();
				})
			);

		new Setting(container)
			.setName("后缀")
			.addText((text) =>
				text.setValue(format.suffix).onChange(async (value) => {
					format.suffix = value;
					await this.plugin.saveSettings();
					updatePreview();
				})
			);

		updatePreview();
	}

	private renderFormatList(container: HTMLElement): void {
		container.empty();

		if (this.plugin.settings.favoriteFormats.length === 0) {
			container.createEl("p", {
				text: "暂无常用格式，点击下方按钮添加。",
				cls: "setting-item-description",
			});
			return;
		}

		for (let i = 0; i < this.plugin.settings.favoriteFormats.length; i++) {
			const format = this.plugin.settings.favoriteFormats[i]!;
			const formatEl = container.createDiv({ cls: "atd-format-item" });

			// Header with name and delete button
			const header = formatEl.createDiv({ cls: "atd-format-item-header" });
			const headerNameEl = header.createEl("span", { text: format.name, cls: "atd-format-item-name" });

			if (i > 0) {
				header.createEl("button", {
					text: "上移",
					cls: "atd-format-item-btn",
				}).addEventListener("click", async () => {
					const formats = this.plugin.settings.favoriteFormats;
					[formats[i]!, formats[i - 1]!] = [formats[i - 1]!, formats[i]!];
					await this.plugin.saveSettings();
					this.display();
				});
			}

			if (i < this.plugin.settings.favoriteFormats.length - 1) {
				header.createEl("button", {
					text: "下移",
					cls: "atd-format-item-btn",
				}).addEventListener("click", async () => {
					const formats = this.plugin.settings.favoriteFormats;
					[formats[i]!, formats[i + 1]!] = [formats[i + 1]!, formats[i]!];
					await this.plugin.saveSettings();
					this.display();
				});
			}

			header.createEl("button", {
				text: "删除",
				cls: "atd-format-item-btn atd-format-item-delete",
			}).addEventListener("click", async () => {
				this.plugin.settings.favoriteFormats.splice(i, 1);
				await this.plugin.saveSettings();
				this.display();
			});

			// Inline editor
			new Setting(formatEl)
				.setName("格式名称")
				.addText((text) =>
					text.setValue(format.name).onChange(async (value) => {
						format.name = value;
						headerNameEl.textContent = value;
						await this.plugin.saveSettings();
					})
				);

			new Setting(formatEl)
				.setName("日期格式")
				.addText((text) =>
					text.setValue(format.dateFormat).onChange(async (value) => {
						format.dateFormat = value;
						await this.plugin.saveSettings();
					})
				);

			new Setting(formatEl)
				.setName("前缀")
				.addText((text) =>
					text.setValue(format.prefix).onChange(async (value) => {
						format.prefix = value;
						await this.plugin.saveSettings();
					})
				);

			new Setting(formatEl)
				.setName("后缀")
				.addText((text) =>
					text.setValue(format.suffix).onChange(async (value) => {
						format.suffix = value;
						await this.plugin.saveSettings();
					})
				);
		}
	}
}
