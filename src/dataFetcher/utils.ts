/**
 * Normalise any Letterboxd URL to its canonical `/film/<slug>/` variant.
 */
export function normalizeFilmUrl(urlString: string): string | null {
	try {
		const parsed = new URL(urlString);
		const segments = parsed.pathname.split('/').filter(Boolean);
		const filmIndex = segments.indexOf('film');

		if (filmIndex === -1 || !segments[filmIndex + 1]) {
			return null;
		}

		const slug = segments[filmIndex + 1];
		return `${parsed.protocol}//${parsed.host}/film/${slug}/`;
	} catch (error) {
		console.error(`Failed to normalise film URL for ${urlString}:`, error);
		return null;
	}
}

/**
 * Resolve relative URLs using the provided base; returns null when inputs are malformed.
 */
export function ensureAbsoluteUrl(value: string | null, baseUrl: string): string | null {
	if (!value) {
		return null;
	}
	try {
		return new URL(value, baseUrl).href;
	} catch (error) {
		console.error(`Failed to resolve URL ${value} with base ${baseUrl}:`, error);
		return null;
	}
}

/**
 * Push a value into an array only when it is non-empty and not already present.
 */
export function addUnique(list: string[], value: string | undefined | null): void {
	if (!value) {
		return;
	}
	const cleaned = value.trim();
	if (!cleaned) {
		return;
	}
	if (!list.includes(cleaned)) {
		list.push(cleaned);
	}
}

/**
 * Convert JSON-LD `Person` entries (string or object format) into a deduplicated list of names.
 */
export function extractPersonNames(value: unknown): string[] {
	const names: string[] = [];
	const values = toArray(value);
	for (const entry of values) {
		if (!entry) continue;
		if (typeof entry === 'string') {
			addUnique(names, entry);
		} else if (typeof entry === 'object' && 'name' in entry && typeof (entry as { name: unknown }).name === 'string') {
			addUnique(names, (entry as { name: string }).name);
		}
	}
	return names;
}

/**
 * Normalise JSON-LD string arrays, trimming whitespace and removing empties.
 */
export function extractStrings(value: unknown): string[] {
	const values = toArray(value);
	return values
		.filter((entry): entry is string => typeof entry === 'string')
		.map(entry => entry.trim())
		.filter(entry => entry.length > 0);
}

function toArray(value: unknown): unknown[] {
	if (!value) return [];
	return Array.isArray(value) ? value : [value];
}
