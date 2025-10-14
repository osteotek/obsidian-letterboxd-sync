export async function fetchPosterUrl(letterboxdUri: string): Promise<string | null> {
	try {
		// Fetch the Letterboxd page
		const response = await fetch(letterboxdUri);
		if (!response.ok) {
			console.error(`Failed to fetch ${letterboxdUri}: ${response.status}`);
			return null;
		}

		const html = await response.text();
		
		// Look for the poster image in the HTML
		// Letterboxd uses og:image meta tag for the poster
		const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
		if (ogImageMatch && ogImageMatch[1]) {
			return ogImageMatch[1];
		}

		// Alternative: look for the poster div
		const posterMatch = html.match(/<img[^>]+class="[^"]*image[^"]*"[^>]+src="([^"]+)"/);
		if (posterMatch && posterMatch[1]) {
			return posterMatch[1];
		}

		return null;
	} catch (error) {
		console.error(`Error fetching poster from ${letterboxdUri}:`, error);
		return null;
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
