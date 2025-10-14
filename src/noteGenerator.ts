import { LetterboxdMovie } from './types';

export function generateMovieNote(movie: LetterboxdMovie, posterPath?: string): string {
	const lines: string[] = [];
	
	// Title
	lines.push(`# ${movie.name} (${movie.year})`);
	lines.push('');
	
	// Poster image if available
	if (posterPath) {
		lines.push(`![[${posterPath}]]`);
		lines.push('');
	}
	
	// Metadata
	lines.push('## Details');
	lines.push('');
	lines.push(`- **Title**: ${movie.name}`);
	lines.push(`- **Year**: ${movie.year}`);
	lines.push(`- **Letterboxd**: ${movie.letterboxdUri}`);
	
	if (movie.rating) {
		lines.push(`- **Rating**: ${movie.rating} ⭐`);
	}
	
	if (movie.watchedDate) {
		lines.push(`- **Watched Date**: ${movie.watchedDate}`);
	}
	
	if (movie.rewatch && movie.rewatch.toLowerCase() === 'yes') {
		lines.push(`- **Rewatch**: Yes 🔁`);
	}
	
	if (movie.tags) {
		const tags = movie.tags.split(',').map(t => t.trim()).filter(t => t);
		if (tags.length > 0) {
			lines.push(`- **Tags**: ${tags.map(t => `#${t.replace(/\s+/g, '-')}`).join(', ')}`);
		}
	}
	
	lines.push('');
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
