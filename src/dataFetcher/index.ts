import { resolveCanonicalFilmPage } from './canonical';
import { debugLog, setDebugLogging } from './debug';
import { extractDescriptionFromHtml, parseJsonLdData } from './jsonLd';
import { requestArrayBufferWithRedirect } from './request';
import { createEmptyPageData, MoviePageData } from './types';

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
		const jsonLdData = html ? parseJsonLdData(html, resolvedUrl) : null;
		if (!jsonLdData) {
			console.warn(`JSON-LD metadata missing for ${resolvedUrl}`);
		}
		const posterUrl = jsonLdData?.posterUrl ?? null;
		let description = jsonLdData?.description ?? '';
		if ((!description || description.trim().length === 0) && html) {
			const fallbackDescription = extractDescriptionFromHtml(html);
			if (fallbackDescription) {
				debugLog('Using fallback OG description from HTML');
				description = fallbackDescription;
			}
		}
		description = description.trim();
		const directors = jsonLdData?.directors ?? [];
		const genres = jsonLdData?.genres ?? [];
		const cast = jsonLdData?.cast ? jsonLdData.cast.slice(0, 10) : [];
		const averageRating = jsonLdData?.averageRating ?? undefined;
		const studios = jsonLdData?.studios ?? [];
		const countries = jsonLdData?.countries ?? [];
		const canonicalUrl = jsonLdData?.movieUrl ?? resolvedUrl;
		if (jsonLdData?.movieUrl) {
			debugLog(`Canonical URL from JSON-LD: ${jsonLdData.movieUrl}`);
		}
		if (!posterUrl) {
			console.warn(`JSON-LD metadata missing poster image for ${resolvedUrl}`);
		} else {
			debugLog(`Poster URL from JSON-LD: ${posterUrl}`);
		}

		return {
			posterUrl,
			metadata: { directors, genres, description, cast, averageRating, studios, countries },
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

export * from './types';
export { setDebugLogging };
