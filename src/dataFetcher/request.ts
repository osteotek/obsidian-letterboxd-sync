import { requestUrl } from 'obsidian';
import { debugLog } from './debug';

const HTML_HEADERS = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
	'Accept-Language': 'en-US,en;q=0.9',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ObsidianLetterboxdSync/1.0'
};

/**
 * Fetch text resources while manually following redirects via Obsidian's requestUrl helper.
 */
export async function requestTextWithRedirect(url: string, maxRedirects = 5): Promise<{ url: string; text: string }> {
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
			debugLog(`Redirect ${response.status} from ${currentUrl} to ${location}`);
			currentUrl = resolveUrl(location, currentUrl);
			continue;
		}

		if (response.status >= 200 && response.status < 300) {
			debugLog(`Fetched ${currentUrl} with status ${response.status}`);
			return { url: currentUrl, text: response.text };
		}

		throw new Error(`Failed to fetch ${currentUrl}: status ${response.status}`);
	}

	throw new Error(`Too many redirects when fetching ${url}`);
}

/**
 * Fetch binary resources (posters) with the same redirect logic as `requestTextWithRedirect`.
 */
export async function requestArrayBufferWithRedirect(url: string, maxRedirects = 5): Promise<{ url: string; arrayBuffer: ArrayBuffer }> {
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
			debugLog(`Binary redirect ${response.status} from ${currentUrl} to ${location}`);
			currentUrl = resolveUrl(location, currentUrl);
			continue;
		}

		if (response.status >= 200 && response.status < 300) {
			debugLog(`Fetched binary ${currentUrl} with status ${response.status}`);
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
