import { extractCanonicalUrlFromHtml } from './jsonLd';
import { requestTextWithRedirect } from './request';
import { normalizeFilmUrl } from './utils';

/**
 * Follow redirects and canonical hints until we reach the canonical film page.
 */
export async function resolveCanonicalFilmPage(initialUrl: string): Promise<{ url: string; html: string }> {
	let targetUrl = normalizeFilmUrl(initialUrl) ?? initialUrl;
	let lastFetchedUrl = initialUrl;
	let html: string | null = null;

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
