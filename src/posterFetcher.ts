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
			const response = await fetch(letterboxdUri, { redirect: 'follow' });
			if (!response.ok) {
				console.error(`Failed to fetch ${letterboxdUri}: ${response.status}`);
				return createEmptyPageData();
			}
			
			const redirectedUrl = response.url;
			const normalizedUrl = normalizeFilmUrl(redirectedUrl);
			
			if (!normalizedUrl) {
				console.error(`Could not extract movie page from: ${redirectedUrl}`);
				return createEmptyPageData();
			}

			moviePageUrl = normalizedUrl;
			canonicalUrl = normalizedUrl;
			if (normalizedUrl === redirectedUrl) {
				html = await response.text();
			}
		}
		
		if (!html) {
			const response = await fetch(moviePageUrl);
			if (!response.ok) {
				console.error(`Failed to fetch movie page ${moviePageUrl}: ${response.status}`);
				return createEmptyPageData();
			}
			html = await response.text();
			if (!canonicalUrl) {
				canonicalUrl = normalizeFilmUrl(response.url) ?? normalizeFilmUrl(moviePageUrl) ?? response.url;
			}
		} else if (!canonicalUrl) {
			canonicalUrl = normalizeFilmUrl(moviePageUrl) ?? moviePageUrl;
		}
		
		// Extract poster URL
		let posterUrl: string | null = null;
		const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
		if (ogImageMatch && ogImageMatch[1]) {
			posterUrl = ogImageMatch[1];
		} else {
			const posterMatch = html.match(/<img[^>]+class="[^"]*image[^"]*"[^>]+src="([^"]+)"/);
			if (posterMatch && posterMatch[1]) {
				posterUrl = posterMatch[1];
			}
		}

		// Extract description from og:description meta tag
		let description = '';
		const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
		if (ogDescMatch && ogDescMatch[1]) {
			description = ogDescMatch[1].trim();
		} else {
			// Fallback: try meta name="description"
			const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
			if (descMatch && descMatch[1]) {
				description = descMatch[1].trim();
			}
		}

		// Extract directors
		const directors: string[] = [];
		const directorMatches = html.matchAll(/<a[^>]+href="\/director\/[^"]+"[^>]*>([^<]+)<\/a>/g);
		for (const match of directorMatches) {
			if (match[1] && !directors.includes(match[1].trim())) {
				directors.push(match[1].trim());
			}
		}

		// Extract genres
		const genres: string[] = [];
		const genreMatches = html.matchAll(/<a[^>]+href="\/films\/genre\/[^"]+"[^>]*>([^<]+)<\/a>/g);
		for (const match of genreMatches) {
			if (match[1] && !genres.includes(match[1].trim())) {
				genres.push(match[1].trim());
			}
		}

		// Extract cast members
		const cast: string[] = [];
		const castMatches = html.matchAll(/<a[^>]+href="\/actor\/[^"]+"[^>]*>([^<]+)<\/a>/g);
		for (const match of castMatches) {
			if (match[1] && !cast.includes(match[1].trim())) {
				cast.push(match[1].trim());
			}
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
		const response = await fetch(url);
		if (!response.ok) {
			console.error(`Failed to download poster: ${response.status}`);
			return null;
		}
		return await response.arrayBuffer();
	} catch (error) {
		console.error('Error downloading poster:', error);
		return null;
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
