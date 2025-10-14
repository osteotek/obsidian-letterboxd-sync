import { LetterboxdMovie, MovieMetadata } from './types';

export function generateMovieNote(
	movie: LetterboxdMovie, 
	posterPath?: string,
	metadata?: MovieMetadata
): string {
	const lines: string[] = [];
	
	// YAML frontmatter
	lines.push('---');
	lines.push(`title: "${movie.name}"`);
	lines.push(`year: ${movie.year}`);
	
	if (movie.rating) {
		lines.push(`rating: ${movie.rating}`);
	}
	
	if (posterPath) {
		lines.push(`cover: "[[${posterPath}]]"`);
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
	
	if (movie.watchedDate) {
		lines.push(`watched: ${movie.watchedDate}`);
	}
	
	if (movie.rewatch && movie.rewatch.toLowerCase() === 'yes') {
		lines.push('rewatch: true');
	}
	
	// Convert short URI to full Letterboxd URL
	let letterboxdUrl = movie.letterboxdUri;
	if (letterboxdUrl.includes('boxd.it')) {
		// Extract the short code and construct full URL
		const shortCode = letterboxdUrl.split('/').pop();
		// We'll keep the original URI for now as we don't have the slug
		letterboxdUrl = movie.letterboxdUri;
	}
	lines.push(`letterboxd: ${letterboxdUrl}`);
	
	lines.push('status: Watched');
	lines.push('---');
	lines.push('');
	
	// Body content
	lines.push(`# ${movie.name} (${movie.year})`);
	lines.push('');
	
	if (movie.tags) {
		const tags = movie.tags.split(',').map(t => t.trim()).filter(t => t);
		if (tags.length > 0) {
			lines.push(`Tags: ${tags.map(t => `#${t.replace(/\s+/g, '-')}`).join(', ')}`);
			lines.push('');
		}
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
