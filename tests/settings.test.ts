import "./obsidian-dom-polyfill";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Setting } from "obsidian";
import { setLocale, t } from "../src/i18n";
import { AtDateSettingTab } from "../src/settings";
import { DEFAULT_SETTINGS, AtDatePickerSettings } from "../src/types";

function makeSettings(overrides: Partial<AtDatePickerSettings> = {}): AtDatePickerSettings {
	return JSON.parse(JSON.stringify({ ...DEFAULT_SETTINGS, ...overrides }));
}

function makeMockPlugin(settings: AtDatePickerSettings) {
	return {
		settings,
		app: {},
		loadData: vi.fn().mockResolvedValue(settings),
		saveData: vi.fn().mockResolvedValue(undefined),
		saveSettings: vi.fn().mockResolvedValue(undefined),
		manifest: { id: "at-date-picker" },
	} as unknown as import("../src/main").default;
}

/** Mount declarative render/action sections into containerEl for DOM tests. */
function mountSettingsUi(tab: AtDateSettingTab): void {
	tab.containerEl.empty();
	tab.update = vi.fn(() => {
		mountSettingsUi(tab);
	}) as unknown as () => void;

	for (const item of tab.getSettingDefinitions()) {
		if (!("type" in item)) continue;
		if (item.type !== "group" && item.type !== "list") continue;
		for (const child of item.items ?? []) {
			if ("render" in child && typeof child.render === "function") {
				const setting = new Setting(tab.containerEl);
				child.render(setting, {} as never);
			}
			if ("action" in child && typeof child.action === "function" && child.name === t("addFormat")) {
				const wrap = tab.containerEl.createDiv();
				const btn = wrap.createEl("button", { text: child.name });
				btn.addEventListener("click", () => child.action!(btn, 0));
			}
		}
	}
}

describe("settings layout hosts", () => {
	it("keeps block hosts inside framework setting rows", () => {
		const settings = makeSettings({
			favoriteFormats: [
				{ name: "Wiki", dateFormat: "YYYY-MM-DD", prefix: "[[", suffix: "]]" },
			],
		});
		const plugin = makeMockPlugin(settings);
		const tab = new AtDateSettingTab({} as never, plugin);
		mountSettingsUi(tab);

		const editorHost = tab.containerEl.querySelector(".atd-format-editor-host");
		const listHost = tab.containerEl.querySelector(".atd-format-list-host");
		expect(editorHost).not.toBeNull();
		expect(listHost).not.toBeNull();
		expect(editorHost!.hasClass("setting-item")).toBe(true);
		expect(editorHost!.hasClass("atd-setting-block-host")).toBe(true);
		expect(tab.containerEl.querySelectorAll(".atd-format-item").length).toBe(1);
	});

	it("puts name/date and prefix/suffix on two-column rows", () => {
		const settings = makeSettings({
			favoriteFormats: [
				{ name: "Wiki", dateFormat: "YYYY-MM-DD", prefix: "[[", suffix: "]]" },
			],
		});
		const plugin = makeMockPlugin(settings);
		const tab = new AtDateSettingTab({} as never, plugin);
		mountSettingsUi(tab);

		const editorHost = tab.containerEl.querySelector(".atd-format-editor-host")!;
		expect(editorHost.querySelector(".atd-format-editor-body")).not.toBeNull();
		const editorRows = editorHost.querySelectorAll(".atd-format-fields-row");
		expect(editorHost.querySelectorAll(".atd-format-fields").length).toBe(1);
		expect(editorRows.length).toBe(2);
		expect(editorRows[0]!.querySelectorAll(":scope > .setting-item").length).toBe(2);
		expect(editorRows[1]!.querySelectorAll(":scope > .setting-item").length).toBe(2);

		const item = tab.containerEl.querySelector(".atd-format-item")!;
		const itemRows = item.querySelectorAll(".atd-format-fields-row");
		expect(itemRows.length).toBe(2);
		expect(itemRows[0]!.querySelectorAll(":scope > .setting-item").length).toBe(2);
	});

	it("adds a format via the add-format button render", () => {
		const settings = makeSettings({ favoriteFormats: [] });
		const plugin = makeMockPlugin(settings);
		const tab = new AtDateSettingTab({} as never, plugin);
		mountSettingsUi(tab);

		const addBtn = Array.from(tab.containerEl.querySelectorAll("button")).find(
			(b) => b.textContent === t("addFormat")
		);
		expect(addBtn).toBeTruthy();
		addBtn!.dispatchEvent(new Event("click"));
		expect(plugin.settings.favoriteFormats.length).toBe(1);
	});
});

describe("AtDateSettingTab", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
		setLocale("zh");
	});

	describe("constructor", () => {
		it("stores the plugin reference", () => {
			const settings = makeSettings();
			const plugin = makeMockPlugin(settings);
			const tab = new AtDateSettingTab({} as never, plugin);
			expect(tab.plugin).toBe(plugin);
		});
	});

	describe("getSettingDefinitions", () => {
		it("exposes searchable core settings", () => {
			const settings = makeSettings({ triggerChar: "#" });
			const plugin = makeMockPlugin(settings);
			const tab = new AtDateSettingTab({} as never, plugin);
			const defs = tab.getSettingDefinitions();
			const names = defs.map((d) => ("name" in d ? d.name : ("heading" in d ? d.heading : "")));
			expect(names).toContain(t("triggerChar"));
			expect(names).toContain(t("rememberLastFormat"));
			expect(names).toContain(t("includeWeekday"));
		});

		it("hides weekday controls when includeWeekday is off", () => {
			const settings = makeSettings({ includeWeekday: false });
			const plugin = makeMockPlugin(settings);
			const tab = new AtDateSettingTab({} as never, plugin);
			const weekdayFormat = tab.getSettingDefinitions().find(
				(d) => "name" in d && d.name === t("weekdayFormat")
			) as { visible?: () => boolean } | undefined;
			expect(weekdayFormat?.visible?.()).toBe(false);
		});
	});

	describe("mounted format UI", () => {
		it("renders favorite format items", () => {
			const settings = makeSettings({
				favoriteFormats: [
					{ name: "Wiki", dateFormat: "YYYY-MM-DD", prefix: "[[", suffix: "]]" },
					{ name: "Plain", dateFormat: "YYYY-MM-DD", prefix: "", suffix: "" },
				],
			});
			const plugin = makeMockPlugin(settings);
			const tab = new AtDateSettingTab({} as never, plugin);
			mountSettingsUi(tab);

			expect(tab.containerEl.querySelectorAll(".atd-format-item").length).toBe(2);
		});

		it("shows empty message when no favorite formats", () => {
			const settings = makeSettings({ favoriteFormats: [] });
			const plugin = makeMockPlugin(settings);
			const tab = new AtDateSettingTab({} as never, plugin);
			mountSettingsUi(tab);

			const emptyMsg = tab.containerEl.querySelector(".atd-format-list p");
			expect(emptyMsg).not.toBeNull();
			expect(emptyMsg!.textContent).toContain("暂无常用格式");
		});

		it("adds a new format when add button is clicked", () => {
			const settings = makeSettings({ favoriteFormats: [] });
			const plugin = makeMockPlugin(settings);
			const tab = new AtDateSettingTab({} as never, plugin);
			mountSettingsUi(tab);

			const addBtn = Array.from(tab.containerEl.querySelectorAll("button")).find(
				(b) => b.textContent === t("addFormat")
			);
			expect(addBtn).toBeTruthy();
			addBtn!.dispatchEvent(new Event("click"));

			expect(plugin.settings.favoriteFormats.length).toBe(1);
			expect(plugin.settings.favoriteFormats[0]!.name).toBe("新格式");
		});
	});

	describe("format list operations", () => {
		it("deletes a format when delete button is clicked", () => {
			const settings = makeSettings({
				favoriteFormats: [
					{ name: "A", dateFormat: "YYYY", prefix: "", suffix: "" },
					{ name: "B", dateFormat: "MM", prefix: "", suffix: "" },
				],
			});
			const plugin = makeMockPlugin(settings);
			const tab = new AtDateSettingTab({} as never, plugin);
			mountSettingsUi(tab);

			const deleteBtns = tab.containerEl.querySelectorAll(".atd-format-item-delete");
			expect(deleteBtns.length).toBe(2);
			deleteBtns[0]!.dispatchEvent(new Event("click"));

			expect(plugin.settings.favoriteFormats.length).toBe(1);
			expect(plugin.settings.favoriteFormats[0]!.name).toBe("B");
		});

		it("swaps formats upward when 上移 button is clicked", () => {
			const settings = makeSettings({
				favoriteFormats: [
					{ name: "A", dateFormat: "YYYY", prefix: "", suffix: "" },
					{ name: "B", dateFormat: "MM", prefix: "", suffix: "" },
				],
			});
			const plugin = makeMockPlugin(settings);
			const tab = new AtDateSettingTab({} as never, plugin);
			mountSettingsUi(tab);

			const items = tab.containerEl.querySelectorAll(".atd-format-item");
			const secondItemBtns = items[1]!.querySelectorAll("button");
			const moveUpBtn = Array.from(secondItemBtns).find((b) => b.textContent === "上移");
			expect(moveUpBtn).not.toBeNull();
			moveUpBtn!.dispatchEvent(new Event("click"));

			expect(plugin.settings.favoriteFormats[0]!.name).toBe("B");
			expect(plugin.settings.favoriteFormats[1]!.name).toBe("A");
		});

		it("swaps formats downward when 下移 button is clicked", () => {
			const settings = makeSettings({
				favoriteFormats: [
					{ name: "A", dateFormat: "YYYY", prefix: "", suffix: "" },
					{ name: "B", dateFormat: "MM", prefix: "", suffix: "" },
				],
			});
			const plugin = makeMockPlugin(settings);
			const tab = new AtDateSettingTab({} as never, plugin);
			mountSettingsUi(tab);

			const items = tab.containerEl.querySelectorAll(".atd-format-item");
			const firstItemBtns = items[0]!.querySelectorAll("button");
			const moveDownBtn = Array.from(firstItemBtns).find((b) => b.textContent === "下移");
			expect(moveDownBtn).not.toBeNull();
			moveDownBtn!.dispatchEvent(new Event("click"));

			expect(plugin.settings.favoriteFormats[0]!.name).toBe("B");
			expect(plugin.settings.favoriteFormats[1]!.name).toBe("A");
		});

		it("copies a favorite into defaultFormat via 设为默认 without touching rememberLastFormat", () => {
			const favorite = {
				name: "US Date",
				dateFormat: "MMM D, YYYY",
				prefix: "",
				suffix: "",
			};
			const lastUsed = {
				name: "Wiki",
				dateFormat: "YYYY-MM-DD",
				prefix: "[[",
				suffix: "]]",
			};
			const settings = makeSettings({
				defaultFormat: {
					name: "Standard",
					dateFormat: "YYYY-MM-DD",
					prefix: "",
					suffix: "",
				},
				favoriteFormats: [favorite],
				rememberLastFormat: true,
				lastUsedFormat: lastUsed,
			});
			const plugin = makeMockPlugin(settings);
			const tab = new AtDateSettingTab({} as never, plugin);
			mountSettingsUi(tab);

			const setDefaultBtn = tab.containerEl.querySelector(
				".atd-format-item-set-default"
			) as HTMLButtonElement | null;
			expect(setDefaultBtn).not.toBeNull();
			expect(setDefaultBtn!.textContent).toBe(t("setAsDefault"));
			setDefaultBtn!.dispatchEvent(new Event("click"));

			expect(plugin.settings.defaultFormat).toEqual(favorite);
			expect(plugin.settings.defaultFormat).not.toBe(favorite);
			expect(plugin.settings.rememberLastFormat).toBe(true);
			expect(plugin.settings.lastUsedFormat).toEqual(lastUsed);
		});

		it("marks the matching favorite as 已是默认", () => {
			const favorite = {
				name: "Standard",
				dateFormat: "YYYY-MM-DD",
				prefix: "",
				suffix: "",
			};
			const settings = makeSettings({
				defaultFormat: { ...favorite },
				favoriteFormats: [favorite],
			});
			const plugin = makeMockPlugin(settings);
			const tab = new AtDateSettingTab({} as never, plugin);
			mountSettingsUi(tab);

			const isDefaultBtn = tab.containerEl.querySelector(
				".atd-format-item-is-default"
			) as HTMLButtonElement | null;
			expect(isDefaultBtn).not.toBeNull();
			expect(isDefaultBtn!.textContent).toBe(t("isDefault"));
			expect(isDefaultBtn!.disabled).toBe(true);
			expect(tab.containerEl.querySelector(".atd-format-item-set-default")).toBeNull();
		});

		it("does not render a reset-favorites button", () => {
			const settings = makeSettings();
			const plugin = makeMockPlugin(settings);
			const tab = new AtDateSettingTab({} as never, plugin);
			mountSettingsUi(tab);

			const labels = Array.from(tab.containerEl.querySelectorAll("button")).map(
				(b) => b.textContent
			);
			expect(labels.some((label) => label?.includes("重置为默认"))).toBe(false);
			expect(labels.filter((label) => label === t("addFormat")).length).toBe(1);
		});

		it("first item has no 上移 button", () => {
			const settings = makeSettings({
				favoriteFormats: [
					{ name: "A", dateFormat: "YYYY", prefix: "", suffix: "" },
					{ name: "B", dateFormat: "MM", prefix: "", suffix: "" },
				],
			});
			const plugin = makeMockPlugin(settings);
			const tab = new AtDateSettingTab({} as never, plugin);
			mountSettingsUi(tab);

			const items = tab.containerEl.querySelectorAll(".atd-format-item");
			const firstItemBtns = Array.from(items[0]!.querySelectorAll("button")).map(
				(b) => b.textContent
			);
			expect(firstItemBtns).not.toContain("上移");
		});

		it("last item has no 下移 button", () => {
			const settings = makeSettings({
				favoriteFormats: [
					{ name: "A", dateFormat: "YYYY", prefix: "", suffix: "" },
					{ name: "B", dateFormat: "MM", prefix: "", suffix: "" },
				],
			});
			const plugin = makeMockPlugin(settings);
			const tab = new AtDateSettingTab({} as never, plugin);
			mountSettingsUi(tab);

			const items = tab.containerEl.querySelectorAll(".atd-format-item");
			const lastIdx = items.length - 1;
			const lastItemBtns = Array.from(items[lastIdx]!.querySelectorAll("button")).map(
				(b) => b.textContent
			);
			expect(lastItemBtns).not.toContain("下移");
		});
	});

	describe("format editor preview", () => {
		it("shows valid preview for correct template", () => {
			const settings = makeSettings();
			const plugin = makeMockPlugin(settings);
			const tab = new AtDateSettingTab({} as never, plugin);
			mountSettingsUi(tab);

			const previewValues = tab.containerEl.querySelectorAll(".atd-format-preview-value");
			expect(previewValues.length).toBeGreaterThan(0);
			const firstPreview = previewValues[0] as HTMLElement;
			expect(firstPreview.textContent).not.toContain("格式无效");
			expect(firstPreview.hasClass("is-invalid")).toBe(false);
		});
	});
});
