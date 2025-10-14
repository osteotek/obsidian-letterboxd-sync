import { MovieMetadata } from './types';

export interface MoviePageData {
	posterUrl: string | null;
	metadata: MovieMetadata;
}

export async function fetchMoviePageData(letterboxdUri: string): Promise<MoviePageData> {
	try {
		// Fetch the Letterboxd page
		const response = await fetch(letterboxdUri);
		if (!response.ok) {
			console.error(`Failed to fetch ${letterboxdUri}: ${response.status}`);
			return { posterUrl: null, metadata: { directors: [], genres: [], description: '' } };
		}

		const html = await response.text();
		
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

		return {
			posterUrl,
			metadata: { directors, genres, description }
		};
	} catch (error) {
		console.error(`Error fetching data from ${letterboxdUri}:`, error);
		return { posterUrl: null, metadata: { directors: [], genres: [], description: '' } };
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
