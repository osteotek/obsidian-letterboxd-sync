import { LetterboxdMovie, MovieMetadata, LetterboxdSyncSettings, MetadataFieldsConfig } from './types';

interface TemplateData {
	title: string;
	year: string;
	rating?: string;
	cover?: string;
	description?: string;
	directors?: string[];
	genres?: string[];
	studios?: string[];
	countries?: string[];
	cast?: string[];
	watched?: string;
	rewatch?: boolean;
	letterboxdUrl: string;
	letterboxdRating?: string;
	status: string;
	coverImage?: string;
}

export function generateMovieNote(
	movie: LetterboxdMovie, 
	posterPath: string | undefined,
	metadata: MovieMetadata | undefined,
	resolvedUrl: string | undefined,
	posterLink: string | undefined,
	status: string,
	settings: LetterboxdSyncSettings
): string {
	const filteredMetadata = filterMetadata(metadata, settings.metadataFields);
	
	if (settings.templateFormat === 'custom' && settings.customTemplate) {
		return generateFromCustomTemplate(movie, posterPath, filteredMetadata, resolvedUrl, posterLink, status, settings.customTemplate);
	}
	
	return generateDefaultNote(movie, posterPath, filteredMetadata, resolvedUrl, posterLink, status);
}

function filterMetadata(metadata: MovieMetadata | undefined, fields: MetadataFieldsConfig): MovieMetadata | undefined {
	if (!metadata) return undefined;
	
	return {
		directors: fields.directors ? metadata.directors : [],
		genres: fields.genres ? metadata.genres : [],
		description: fields.description ? metadata.description : '',
		cast: fields.cast ? metadata.cast : [],
		letterboxdRating: fields.letterboxdRating ? metadata.letterboxdRating : undefined,
		studios: fields.studios ? metadata.studios : [],
		countries: fields.countries ? metadata.countries : []
	};
}

function generateFromCustomTemplate(
	movie: LetterboxdMovie,
	posterPath: string | undefined,
	metadata: MovieMetadata | undefined,
	resolvedUrl: string | undefined,
	posterLink: string | undefined,
	status: string,
	template: string
): string {
	const data: TemplateData = {
		title: movie.name,
		year: movie.year,
		rating: movie.rating || undefined,
		cover: posterPath ? `[[${posterPath}]]` : (posterLink || undefined),
		description: metadata?.description || undefined,
		directors: metadata?.directors && metadata.directors.length > 0 ? metadata.directors : undefined,
		genres: metadata?.genres && metadata.genres.length > 0 ? metadata.genres : undefined,
		studios: metadata?.studios && metadata.studios.length > 0 ? metadata.studios : undefined,
		countries: metadata?.countries && metadata.countries.length > 0 ? metadata.countries : undefined,
		cast: metadata?.cast && metadata.cast.length > 0 ? metadata.cast : undefined,
		watched: movie.watchedDate || undefined,
		rewatch: movie.rewatch && movie.rewatch.toLowerCase() === 'yes' ? true : undefined,
		letterboxdUrl: normalizeLetterboxdUrl(resolvedUrl ?? movie.letterboxdUri),
		letterboxdRating: metadata?.letterboxdRating || undefined,
		status: status,
		coverImage: posterPath ? `![[${posterPath}]]` : (posterLink ? `![${escapeYamlString(movie.name)} Poster](${posterLink})` : undefined)
	};
	
	return renderTemplate(template, data);
}

function generateDefaultNote(
	movie: LetterboxdMovie, 
	posterPath: string | undefined,
	metadata: MovieMetadata | undefined,
	resolvedUrl: string | undefined,
	posterLink: string | undefined,
	status: string
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
	} else if (posterLink) {
		lines.push(`cover: "${posterLink}"`);
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

	// Production companies
	if (metadata && metadata.studios && metadata.studios.length > 0) {
		lines.push('studios:');
		metadata.studios.forEach(studio => {
			lines.push(`  - ${studio}`);
		});
	}

	// Countries of origin
	if (metadata && metadata.countries && metadata.countries.length > 0) {
		lines.push('countries:');
		metadata.countries.forEach(country => {
			lines.push(`  - ${country}`);
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
	lines.push(`letterboxdUrl: ${letterboxdUrl}`);

	if (metadata && metadata.letterboxdRating) {
		lines.push(`letterboxdRating: ${metadata.letterboxdRating}`);
	}

	lines.push(`status: ${status}`);
	lines.push('---');
	lines.push('');
	
	// Body content
	if (posterPath) {
		lines.push(`![[${posterPath}]]`);
		lines.push('');
	} else if (posterLink) {
		lines.push(`![${escapeYamlString(movie.name)} Poster](${posterLink})`);
		lines.push('');
	}
	
	lines.push('## Notes');
	lines.push('');
	lines.push('');
	
	return lines.join('\n');
}

/**
 * Simple Handlebars-style template renderer
 */
function renderTemplate(template: string, data: TemplateData): string {
	let result = template;
	
	// Handle {{#if field}} ... {{/if}} blocks
	result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, field, content) => {
		const value = data[field as keyof TemplateData];
		if (value !== undefined && value !== null && value !== false && 
			!(Array.isArray(value) && value.length === 0)) {
			return content;
		}
		return '';
	});
	
	// Handle {{#each field}} ... {{/each}} blocks for arrays
	result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, field, content) => {
		const value = data[field as keyof TemplateData];
		if (Array.isArray(value)) {
			return value.map(item => content.replace(/\{\{this\}\}/g, String(item))).join('');
		}
		return '';
	});
	
	// Handle simple {{variable}} replacements
	result = result.replace(/\{\{(\w+)\}\}/g, (match, field) => {
		const value = data[field as keyof TemplateData];
		if (value === undefined || value === null) return '';
		if (typeof value === 'boolean') return '';
		if (Array.isArray(value)) return '';
		return String(value);
	});
	
	return result;
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
	return value
		.replace(/\\/g, '\\\\')  // Escape backslashes first
		.replace(/"/g, '\\"')     // Escape double quotes
		.replace(/\n/g, '\\n')    // Escape newlines
		.replace(/\r/g, '\\r')    // Escape carriage returns
		.replace(/\t/g, '\\t');   // Escape tabs
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
