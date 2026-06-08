export interface RelativeDateResult {
	date: Date;
	text: string;
}

/**
 * Returns true if the query looks like a prefix of a relative date expression.
 * This is intentionally permissive: empty string, pure digits (e.g. "3"),
 * and partial units (e.g. "+" or "+3") all match so the popup stays open
 * while the user is still typing.
 */
export function isRelativeDateInput(query: string): boolean {
	return /^[+-]?\d*[dwmy]?$/i.test(query);
}

export function parseRelativeDate(query: string): RelativeDateResult | null {
	const match = query.match(/^([+-])(\d+)([dwmy])$/i);
	if (!match) return null;

	const sign = match[1]! === "+" ? 1 : -1;
	const amount = parseInt(match[2]!, 10);
	const unit = match[3]!.toLowerCase();

	const date = new Date();
	date.setHours(0, 0, 0, 0);

	switch (unit) {
		case "d":
			date.setDate(date.getDate() + sign * amount);
			break;
		case "w":
			date.setDate(date.getDate() + sign * amount * 7);
			break;
		case "m":
			date.setMonth(date.getMonth() + sign * amount);
			break;
		case "y":
			date.setFullYear(date.getFullYear() + sign * amount);
			break;
		default:
			return null;
	}

	return { date, text: query };
}
