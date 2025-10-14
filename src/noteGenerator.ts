import { LetterboxdMovie, MovieMetadata } from './types';

export function generateMovieNote(
	movie: LetterboxdMovie, 
	posterPath?: string,
	metadata?: MovieMetadata,
	resolvedUrl?: string
): string {
	const lines: string[] = [];
	
	// YAML frontmatter
	lines.push('---');
	lines.push(`title: "${escapeYamlString(movie.name)}"`);
	lines.push(`year: ${movie.year}`);
	
	if (movie.rating) {
		lines.push(`rating: ${movie.rating}`);
	}
	
	if (posterPath) {
		lines.push(`cover: "[[${posterPath}]]"`);
	}
	
	// Description from metadata
	if (metadata && metadata.description) {
		lines.push(`description: "${escapeYamlString(metadata.description)}"`);
	}
	
	// Directors from metadata
	if (metadata && metadata.directors.length > 0) {
		lines.push('directors:');
		metadata.directors.forEach(director => {
			lines.push(`  - ${director}`);
		});
	}
	
	// Genres from metadata
	if (metadata && metadata.genres.length > 0) {
		lines.push('genres:');
		metadata.genres.forEach(genre => {
			lines.push(`  - ${genre}`);
		});
	}
	
	// Cast from metadata
	if (metadata && metadata.cast.length > 0) {
		lines.push('cast:');
		metadata.cast.forEach(actor => {
			lines.push(`  - ${actor}`);
		});
	}
	
	if (movie.watchedDate) {
		lines.push(`watched: ${movie.watchedDate}`);
	}
	
	if (movie.rewatch && movie.rewatch.toLowerCase() === 'yes') {
		lines.push('rewatch: true');
	}
	
	// Use resolved URL when available, otherwise normalize diary URLs when possible
	const letterboxdUrl = normalizeLetterboxdUrl(resolvedUrl ?? movie.letterboxdUri);
	lines.push(`letterboxd: ${letterboxdUrl}`);
	
	lines.push('status: Watched');
	lines.push('---');
	lines.push('');
	
	// Body content
	if (posterPath) {
		lines.push(`![[${posterPath}]]`);
		lines.push('');
	}
	
	lines.push('## Notes');
	lines.push('');
	lines.push('');
	
	return lines.join('\n');
}

export function sanitizeFileName(name: string): string {
	// Remove or replace characters that are invalid in filenames
	return name
		.replace(/[\\/:*?"<>|]/g, '-')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Escape user-provided strings for safe inclusion inside double-quoted YAML values.
 */
function escapeYamlString(value: string): string {
	return value.replace(/"/g, '\\"');
}

function normalizeLetterboxdUrl(urlString: string): string {
	try {
		const parsed = new URL(urlString);
		if (!parsed.hostname.includes('letterboxd.com')) {
			return urlString;
		}
		const segments = parsed.pathname.split('/').filter(Boolean);
		const filmIndex = segments.indexOf('film');
		if (filmIndex !== -1 && segments[filmIndex + 1]) {
			const slug = segments[filmIndex + 1];
			return `${parsed.protocol}//${parsed.host}/film/${slug}/`;
		}
		return urlString;
	} catch {
		return urlString;
	}
}
