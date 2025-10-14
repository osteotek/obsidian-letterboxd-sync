import { requestUrl } from 'obsidian';
import { MovieMetadata } from './types';

export interface MoviePageData {
	posterUrl: string | null;
	metadata: MovieMetadata;
	movieUrl: string | null;
}

export async function fetchMoviePageData(letterboxdUri: string): Promise<MoviePageData> {
	try {
		let moviePageUrl = letterboxdUri;
		let html: string | null = null;
		let canonicalUrl: string | null = null;
		
		if (letterboxdUri.includes('boxd.it')) {
			const shortResult = await requestTextWithRedirect(letterboxdUri);
			
			const normalizedUrl = normalizeFilmUrl(shortResult.url);
			
			if (!normalizedUrl) {
				console.error(`Could not extract movie page from: ${shortResult.url}`);
				return createEmptyPageData();
			}

			moviePageUrl = normalizedUrl;
			canonicalUrl = normalizedUrl;
			if (normalizedUrl === shortResult.url) {
				html = shortResult.text;
			}
		}
		
		if (!html) {
			const pageResult = await requestTextWithRedirect(moviePageUrl);
			html = pageResult.text;
			if (!canonicalUrl) {
				canonicalUrl = normalizeFilmUrl(pageResult.url) ?? normalizeFilmUrl(moviePageUrl) ?? pageResult.url;
			}
		} else if (!canonicalUrl) {
			canonicalUrl = normalizeFilmUrl(moviePageUrl) ?? moviePageUrl;
		}
		
		// Extract poster URL
		let posterUrl: string | null = null;
		let jsonPosterUrl: string | null = null;
		let description = '';
		const directors: string[] = [];
		const genres: string[] = [];
		const cast: string[] = [];

		const jsonLdData = parseJsonLdData(html, moviePageUrl);
		if (jsonLdData) {
			jsonPosterUrl = jsonLdData.posterUrl;
			if (jsonLdData.description) {
				description = jsonLdData.description;
			}
			jsonLdData.directors?.forEach(name => addUnique(directors, name));
			jsonLdData.genres?.forEach(genre => addUnique(genres, genre));
			jsonLdData.cast?.forEach(actor => addUnique(cast, actor));
			if (jsonLdData.movieUrl) {
				canonicalUrl = jsonLdData.movieUrl;
			}
		}

		if (!posterUrl) {
			const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
			if (ogImageMatch && ogImageMatch[1]) {
				posterUrl = ogImageMatch[1];
			} else {
				const posterMatch = html.match(/<img[^>]+class="[^"]*image[^"]*"[^>]+src="([^"]+)"/);
				if (posterMatch && posterMatch[1]) {
					posterUrl = posterMatch[1];
				}
			}
		}
		if (!posterUrl && jsonPosterUrl) {
			posterUrl = jsonPosterUrl;
		}

		// Extract description from og:description meta tag
		const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
		if (ogDescMatch && ogDescMatch[1]) {
			description = description || ogDescMatch[1].trim();
		} else if (!description) {
			// Fallback: try meta name="description"
			const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
			if (descMatch && descMatch[1]) {
				description = descMatch[1].trim();
			}
		}

		// Extract directors
		const directorMatches = html.matchAll(/<a[^>]+href="\/director\/[^"]+"[^>]*>([^<]+)<\/a>/g);
		for (const match of directorMatches) {
			addUnique(directors, match[1]);
		}

		// Extract genres
		const genreMatches = html.matchAll(/<a[^>]+href="\/films\/genre\/[^"]+"[^>]*>([^<]+)<\/a>/g);
		for (const match of genreMatches) {
			addUnique(genres, match[1]);
		}

		// Extract cast members
		const castMatches = html.matchAll(/<a[^>]+href="\/actor\/[^"]+"[^>]*>([^<]+)<\/a>/g);
		for (const match of castMatches) {
			addUnique(cast, match[1]);
		}

		return {
			posterUrl,
			metadata: { directors, genres, description, cast },
			movieUrl: canonicalUrl ?? moviePageUrl
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
	const scriptMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
	if (!scriptMatch || !scriptMatch[1]) {
		return null;
	}

	const sanitizedJson = scriptMatch[1]
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.trim();

	if (!sanitizedJson) {
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

async function requestTextWithRedirect(url: string, maxRedirects = 5): Promise<{ url: string; text: string }> {
	let currentUrl = url;
	for (let i = 0; i <= maxRedirects; i++) {
		const response = await requestUrl({
			url: currentUrl,
			method: 'GET',
			headers: HTML_HEADERS,
			throw: false
		});

		if (isRedirect(response.status) && response.headers.location) {
			currentUrl = resolveUrl(response.headers.location, currentUrl);
			continue;
		}

		if (response.status >= 200 && response.status < 300) {
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

		if (isRedirect(response.status) && response.headers.location) {
			currentUrl = resolveUrl(response.headers.location, currentUrl);
			continue;
		}

		if (response.status >= 200 && response.status < 300) {
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
