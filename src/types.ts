export interface FormatTemplate {
	name: string;
	dateFormat: string;
	prefix: string;
	suffix: string;
}

export interface AtDatePickerSettings {
	triggerChar: string;
	defaultFormat: FormatTemplate;
	favoriteFormats: FormatTemplate[];
	rememberLastFormat: boolean;
	lastUsedFormat: FormatTemplate | null;
}

export const DEFAULT_SETTINGS: AtDatePickerSettings = {
	triggerChar: "@",
	defaultFormat: {
		name: "Standard",
		dateFormat: "YYYY-MM-DD",
		prefix: "",
		suffix: "",
	},
	favoriteFormats: [
		{
			name: "Wiki Link",
			dateFormat: "YYYY-MM-DD",
			prefix: "[[",
			suffix: "]]",
		},
		{
			name: "Chinese",
			dateFormat: "YYYY年MM月DD日",
			prefix: "",
			suffix: "",
		},
		{
			name: "US Date",
			dateFormat: "MMM D, YYYY",
			prefix: "",
			suffix: "",
		},
		{
			name: "US Numeric",
			dateFormat: "MM/DD/YYYY",
			prefix: "",
			suffix: "",
		},
	],
	rememberLastFormat: true,
	lastUsedFormat: null,
};
