import { requestUrl } from 'obsidian';
import { MovieMetadata } from './types';

export interface MoviePageData {
	posterUrl: string | null;
	metadata: MovieMetadata;
	movieUrl: string | null;
}

/**
 * Fetch poster asset and metadata for a Letterboxd film entry.
 *
 * The supplied URL can be a short link, diary link, or canonical film page.
 * We normalise and follow redirects until we arrive at the true film page,
 * then rely on JSON-LD for structured data.
 */
export async function fetchMoviePageData(letterboxdUri: string): Promise<MoviePageData> {
	try {
		const { url: resolvedUrl, html } = await resolveCanonicalFilmPage(letterboxdUri);
		// We only trust JSON-LD for metadata; HTML is used solely as a fallback for description/canonical URL hints.
		const jsonLdData = html ? parseJsonLdData(html, resolvedUrl) : null;
		if (!jsonLdData) {
			console.warn(`JSON-LD metadata missing for ${resolvedUrl}`);
		}
		const posterUrl = jsonLdData?.posterUrl ?? null;
		let description = jsonLdData?.description ?? '';
		if ((!description || description.trim().length === 0) && html) {
			const fallbackDescription = extractDescriptionFromHtml(html);
			if (fallbackDescription) {
				console.debug('Using fallback OG description from HTML');
				description = fallbackDescription;
			}
		}
		description = description.trim();
		const directors = jsonLdData?.directors ?? [];
		const genres = jsonLdData?.genres ?? [];
		const cast = jsonLdData?.cast ? jsonLdData.cast.slice(0, 10) : [];
		const canonicalUrl = jsonLdData?.movieUrl ?? resolvedUrl;
		if (jsonLdData?.movieUrl) {
			console.debug(`Canonical URL from JSON-LD: ${jsonLdData.movieUrl}`);
		}
		if (!posterUrl) {
			console.warn(`JSON-LD metadata missing poster image for ${resolvedUrl}`);
		} else {
			console.debug(`Poster URL from JSON-LD: ${posterUrl}`);
		}

		return {
			posterUrl,
			metadata: { directors, genres, description, cast },
			movieUrl: canonicalUrl
		};
	} catch (error) {
		console.error(`Error fetching data from ${letterboxdUri}:`, error);
		return createEmptyPageData();
	}
}

export async function downloadPoster(url: string): Promise<ArrayBuffer | null> {
	try {
		const result = await requestArrayBufferWithRedirect(url);
		return result.arrayBuffer;
	} catch (error) {
		console.error('Error downloading poster:', error);
		return null;
	}
}

interface JsonLdMetadata {
	posterUrl: string | null;
	description: string | null;
	directors: string[];
	genres: string[];
	cast: string[];
	movieUrl: string | null;
}

function parseJsonLdData(html: string, baseUrl: string): JsonLdMetadata | null {
	const scriptMatch = html.match(/<script[^>]+type=\"application\/ld\+json\"[^>]*>([\s\S]*?)<\/script>/i);
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
		return null;
	}

	const data = parsed as Record<string, unknown>;
	const directors = extractPersonNames(data.director ?? data.directors);
	const cast = extractPersonNames(data.actors ?? data.actor ?? data.cast);
	const genres = extractStrings(data.genre);
	const description = typeof data.description === 'string' ? data.description.trim() : null;
	const posterUrl = ensureAbsoluteUrl(typeof data.image === 'string' ? data.image : null, baseUrl);
	const movieUrl = ensureAbsoluteUrl(typeof data.url === 'string' ? data.url : null, baseUrl);

	return {
		posterUrl,
		description,
		directors,
		genres,
		cast,
		movieUrl
	};
}

function extractPersonNames(value: unknown): string[] {
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

function extractStrings(value: unknown): string[] {
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

function ensureAbsoluteUrl(value: string | null, baseUrl: string): string | null {
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

function addUnique(list: string[], value: string | undefined | null): void {
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

function normalizeFilmUrl(urlString: string): string | null {
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

function createEmptyPageData(): MoviePageData {
	return {
		posterUrl: null,
		metadata: { directors: [], genres: [], description: '', cast: [] },
		movieUrl: null
	};
}

const HTML_HEADERS = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
	'Accept-Language': 'en-US,en;q=0.9',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ObsidianLetterboxdSync/1.0'
};

async function resolveCanonicalFilmPage(initialUrl: string): Promise<{ url: string; html: string }> {
	let targetUrl = normalizeFilmUrl(initialUrl) ?? initialUrl;
	let lastFetchedUrl = initialUrl;
	let html: string | null = null;

	// Repeatedly follow redirects and HTML hints until we land on the canonical /film/<slug>/ page.
	// Repeatedly resolve redirects/canonical hints until we reach the canonical slug.
	for (let attempt = 0; attempt < 4; attempt++) {
		const result = await requestTextWithRedirect(targetUrl);
		lastFetchedUrl = result.url;
		const normalizedFromFetch = normalizeFilmUrl(result.url) ?? extractCanonicalUrlFromHtml(result.text, result.url) ?? null;

		if (normalizedFromFetch && normalizedFromFetch !== result.url) {
			console.debug(`Resolved ${result.url} to canonical ${normalizedFromFetch}, refetching.`);
			targetUrl = normalizedFromFetch;
			html = null;
			continue;
		}

		html = result.text;
		const finalUrl = normalizedFromFetch ?? result.url;
		return { url: finalUrl, html };
	}

	throw new Error(`Unable to resolve canonical film page for ${initialUrl} (last fetched ${lastFetchedUrl})`);
}

async function requestTextWithRedirect(url: string, maxRedirects = 5): Promise<{ url: string; text: string }> {
	let currentUrl = url;
	for (let i = 0; i <= maxRedirects; i++) {
			const response = await requestUrl({
				url: currentUrl,
				method: 'GET',
				headers: HTML_HEADERS,
				throw: false
			});

		const location = getHeader(response.headers, 'location');
		if (isRedirect(response.status) && location) {
			console.debug(`Redirect ${response.status} from ${currentUrl} to ${location}`);
			currentUrl = resolveUrl(location, currentUrl);
			continue;
		}

		if (response.status >= 200 && response.status < 300) {
			console.debug(`Fetched ${currentUrl} with status ${response.status}`);
			return { url: currentUrl, text: response.text };
		}

		throw new Error(`Failed to fetch ${currentUrl}: status ${response.status}`);
	}

	throw new Error(`Too many redirects when fetching ${url}`);
}

async function requestArrayBufferWithRedirect(url: string, maxRedirects = 5): Promise<{ url: string; arrayBuffer: ArrayBuffer }> {
	let currentUrl = url;
	for (let i = 0; i <= maxRedirects; i++) {
			const response = await requestUrl({
				url: currentUrl,
				method: 'GET',
				headers: {
					...HTML_HEADERS,
					Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
				},
				throw: false
			});

			const location = getHeader(response.headers, 'location');
			if (isRedirect(response.status) && location) {
				console.debug(`Binary redirect ${response.status} from ${currentUrl} to ${location}`);
				currentUrl = resolveUrl(location, currentUrl);
				continue;
			}

			if (response.status >= 200 && response.status < 300) {
				console.debug(`Fetched binary ${currentUrl} with status ${response.status}`);
				return { url: currentUrl, arrayBuffer: response.arrayBuffer };
			}

			throw new Error(`Failed to download resource ${currentUrl}: status ${response.status}`);
	}

	throw new Error(`Too many redirects when fetching binary resource ${url}`);
}

function isRedirect(status: number): boolean {
	return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function resolveUrl(location: string, baseUrl: string): string {
	try {
		return new URL(location, baseUrl).href;
	} catch {
		return location;
	}
}

function getHeader(headers: Record<string, string>, name: string): string | undefined {
	const direct = headers[name];
	if (direct) return direct;
	const lowerName = name.toLowerCase();
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === lowerName) {
			return value;
		}
	}
	return undefined;
}

function extractCanonicalUrlFromHtml(html: string | null, baseUrl?: string): string | null {
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

function extractDescriptionFromHtml(html: string | null): string | null {
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
