import { ensureAbsoluteUrl, extractPersonNames, extractStrings } from './utils';

export interface JsonLdMetadata {
	posterUrl: string | null;
	description: string | null;
	directors: string[];
	genres: string[];
	cast: string[];
	movieUrl: string | null;
	averageRating: string | null;
	studios: string[];
	countries: string[];
}

/**
 * Extract structured movie metadata from the page's JSON-LD payload.
 * Returns null when the payload is absent or invalid, allowing callers to fall back gracefully.
 */
export function parseJsonLdData(html: string, baseUrl: string): JsonLdMetadata | null {
	const scriptMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
	if (!scriptMatch || !scriptMatch[1]) {
		console.warn('No JSON-LD script tag found on page');
		return null;
	}

	const sanitizedJson = scriptMatch[1]
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.trim();

	if (!sanitizedJson) {
		console.warn('JSON-LD script tag was empty after sanitization');
		return null;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(sanitizedJson);
	} catch (error) {
		console.error('Failed to parse JSON-LD data:', error);
		return null;
	}

	if (Array.isArray(parsed)) {
		parsed = parsed.find(item => typeof item === 'object' && item !== null && (item as Record<string, unknown>)['@type'] === 'Movie') ?? parsed[0];
	}

	if (!parsed || typeof parsed !== 'object') {
		console.warn('JSON-LD content was not an object or array');
		return null;
	}

	const data = parsed as Record<string, unknown>;
	const directors = extractPersonNames(data.director ?? data.directors);
	const cast = extractPersonNames(data.actors ?? data.actor ?? data.cast);
	const genres = extractStrings(data.genre);
	const description = typeof data.description === 'string' ? data.description.trim() : null;
	const averageRating = extractAggregateRatingValue(data.aggregateRating);
	const studios = extractOrganizationNames(data.productionCompany);
	const countries = extractCountryNames(data.countryOfOrigin);
	const posterUrl = ensureAbsoluteUrl(typeof data.image === 'string' ? data.image : null, baseUrl);
	const movieUrl = ensureAbsoluteUrl(typeof data.url === 'string' ? data.url : null, baseUrl);

	return {
		posterUrl,
		description,
		directors,
		genres,
		cast,
		movieUrl,
		averageRating,
		studios,
		countries
	};
}

/**
 * Fallback for synopsis text when JSON-LD omits the `description` property.
 */
export function extractDescriptionFromHtml(html: string | null): string | null {
	if (!html) {
		return null;
	}

	const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
	if (ogDescMatch && ogDescMatch[1]) {
		return ogDescMatch[1].trim();
	}

	const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
	if (metaDescMatch && metaDescMatch[1]) {
		return metaDescMatch[1].trim();
	}

	return null;
}

function extractAggregateRatingValue(value: unknown): string | null {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const ratingObj = value as { ratingValue?: unknown };
	const ratingValue = ratingObj.ratingValue;

	if (typeof ratingValue === 'number') {
		return ratingValue.toString();
	}

	if (typeof ratingValue === 'string') {
		return ratingValue.trim() || null;
	}

	return null;
}

function extractOrganizationNames(value: unknown): string[] {
	if (!value) {
		return [];
	}
	const entries = Array.isArray(value) ? value : [value];
	const names: string[] = [];
	for (const entry of entries) {
		if (entry && typeof entry === 'object' && 'name' in entry && typeof (entry as { name: unknown }).name === 'string') {
			names.push((entry as { name: string }).name);
		}
		if (typeof entry === 'string') {
			names.push(entry);
		}
	}
	return names;
}

function extractCountryNames(value: unknown): string[] {
	if (!value) {
		return [];
	}
	const entries = Array.isArray(value) ? value : [value];
	const results: string[] = [];
	for (const entry of entries) {
		if (entry && typeof entry === 'object' && 'name' in entry && typeof (entry as { name: unknown }).name === 'string') {
			results.push((entry as { name: string }).name);
		}
		if (typeof entry === 'string') {
			results.push(entry);
		}
	}
	return results;
}

/**
 * Inspect HTML for canonical URL hints (`<link rel="canonical">` / `og:url`).
 */
export function extractCanonicalUrlFromHtml(html: string | null, baseUrl?: string): string | null {
	if (!html) {
		return null;
	}

	const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
	if (canonicalMatch && canonicalMatch[1]) {
		const canonical = ensureAbsoluteUrl(canonicalMatch[1], baseUrl ?? '');
		if (canonical) {
			return canonical;
		}
	}

	const ogUrlMatch = html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i);
	if (ogUrlMatch && ogUrlMatch[1]) {
		const ogUrl = ensureAbsoluteUrl(ogUrlMatch[1], baseUrl ?? '');
		if (ogUrl) {
			return ogUrl;
		}
	}

	return null;
}
