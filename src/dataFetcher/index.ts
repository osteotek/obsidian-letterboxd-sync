import { resolveCanonicalFilmPage } from './canonical';
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

export * from './types';
