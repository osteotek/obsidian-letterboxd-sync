import { App, Notice, TFile, normalizePath } from 'obsidian';
import { LetterboxdMovie, LetterboxdSyncSettings, MovieMetadata } from './types';
import { parseLetterboxdCSV } from './csvParser';
import { fetchMoviePageData, downloadPoster } from './dataFetcher';
import { generateMovieNote, sanitizeFileName } from './noteGenerator';

type ImportProgressCallback = (current: number, total: number, movie: string, posterUrl?: string, success?: boolean) => void;

interface ImportOptions {
	sourceName?: string;
	onProgress?: ImportProgressCallback;
	isCancelled?: () => boolean;
	excludeMovies?: Set<string>;
}

export async function importLetterboxdCSV(
	app: App,
	csvContent: string,
	settings: LetterboxdSyncSettings,
	options?: ImportOptions
): Promise<void> {
	try {
		// Parse CSV
		let movies = parseLetterboxdCSV(csvContent);
		
		// Filter out excluded movies if provided
		if (options?.excludeMovies && options.excludeMovies.size > 0) {
			const originalCount = movies.length;
			movies = movies.filter(movie => {
				const movieId = `${movie.name}|${movie.year}`;
				return !options.excludeMovies!.has(movieId);
			});
			const excludedCount = originalCount - movies.length;
			if (excludedCount > 0) {
				console.log(`Excluded ${excludedCount} duplicate movies from ${options.sourceName || 'CSV'}`);
			}
		}
		
		// Filter out existing movies if skipExisting is enabled
		if (settings.skipExisting) {
			const outputFolder = normalizePath(settings.outputFolder);
			const originalCount = movies.length;
			const filteredMovies: LetterboxdMovie[] = [];
			
			for (const movie of movies) {
				const fileNameBase = movie.year ? `${movie.name} (${movie.year})` : movie.name;
				const fileName = sanitizeFileName(fileNameBase);
				const filePath = normalizePath(`${outputFolder}/${fileName}.md`);
				const existingFile = app.vault.getAbstractFileByPath(filePath);
				
				if (!existingFile) {
					filteredMovies.push(movie);
				}
			}
			
			const skippedCount = originalCount - filteredMovies.length;
			if (skippedCount > 0) {
				console.log(`Skipped ${skippedCount} existing movies from ${options?.sourceName || 'CSV'}`);
				new Notice(`Skipped ${skippedCount} existing movies`);
			}
			
			movies = filteredMovies;
		}
		
		if (movies.length === 0) {
			new Notice('No movies to import (all were duplicates or already exist)');
			return;
		}

		new Notice(`Found ${movies.length} movies. Starting import...`);

		// Ensure output folder exists
		const outputFolder = normalizePath(settings.outputFolder);
		await ensureFolderExists(app, outputFolder);

		// Ensure poster folder exists if needed
		if (settings.downloadPosters) {
			const posterFolder = normalizePath(settings.posterFolder);
			await ensureFolderExists(app, posterFolder);
		}

		// Process each movie
		let successCount = 0;
		let failCount = 0;

	let cancelled = false;

	for (let i = 0; i < movies.length; i++) {
		if (options?.isCancelled?.()) {
			cancelled = true;
			break;
		}

		const movie = movies[i];
		
		try {
			await importMovie(app, movie, settings, options?.sourceName, (posterUrl?: string) => {
				if (options?.onProgress) {
					options.onProgress(i + 1, movies.length, movie.name, posterUrl, true);
				}
			});
			successCount++;
		} catch (error) {
			console.error(`Failed to import ${movie.name}:`, error);
			if (options?.onProgress) {
				options.onProgress(i + 1, movies.length, movie.name, undefined, false);
			}
			failCount++;
		}

		// Use configurable rate limiting delay
		const delay = settings.rateLimitDelay ?? 200;
		await sleep(delay);
	}

	if (cancelled) {
		new Notice(`Import cancelled: ${successCount} imported, ${failCount} failed`);
		return;
	}

	new Notice(`Import complete: ${successCount} successful, ${failCount} failed`);
	} catch (error) {
		console.error('Error importing CSV:', error);
		new Notice(`Error importing CSV: ${error.message}`);
		throw error;
	}
}

async function importMovie(
	app: App,
	movie: LetterboxdMovie,
	settings: LetterboxdSyncSettings,
	sourceName?: string,
	onPosterFetched?: (posterUrl?: string) => void
): Promise<void> {
	const fileNameBase = movie.year ? `${movie.name} (${movie.year})` : movie.name;
	const fileName = sanitizeFileName(fileNameBase);
	const filePath = normalizePath(`${settings.outputFolder}/${fileName}.md`);

	const existingFile = app.vault.getAbstractFileByPath(filePath);
	const existingTFile = existingFile instanceof TFile ? existingFile : null;

	let posterPath: string | undefined;
	let posterLink: string | undefined;
	let metadata: MovieMetadata | undefined;
	let resolvedMovieUrl: string | undefined;
	const status = determineStatus(movie, sourceName);

	if (movie.letterboxdUri) {
		try {
			const pageData = await fetchMoviePageData(movie.letterboxdUri);
			metadata = pageData.metadata;
			resolvedMovieUrl = pageData.movieUrl ?? undefined;
			if (pageData.posterUrl) {
				posterLink = pageData.posterUrl;
				// Notify callback with poster URL
				if (onPosterFetched) {
					onPosterFetched(pageData.posterUrl);
				}
			}

			if (settings.downloadPosters && pageData.posterUrl) {
				const posterFileNameBase = movie.year ? `${movie.name}_${movie.year}` : movie.name;
				const posterFileName = sanitizeFileName(`${posterFileNameBase}.jpg`);
				posterPath = `${settings.posterFolder}/${posterFileName}`;
				const posterFullPath = normalizePath(posterPath);
				const posterFolderPath = getFolderPath(posterFullPath);
				const existingPoster = app.vault.getAbstractFileByPath(posterFullPath);
				if (existingPoster) {
					console.debug(`Poster already exists: ${posterFullPath}`);
				} else {
					await ensureFolderExists(app, posterFolderPath);
					const posterData = await downloadPoster(pageData.posterUrl);
					if (posterData) {
						await app.vault.createBinary(posterFullPath, posterData);
						console.debug(`Poster saved to ${posterFullPath}`);
					} else {
						console.warn(`Poster download returned empty data for ${movie.name}`);
					}
				}
			}
		} catch (error) {
			console.error(`Failed to fetch data for ${movie.name}:`, error);
		}
	}

	const noteContent = generateMovieNote(
		movie,
		settings.downloadPosters ? posterPath : undefined,
		metadata,
		resolvedMovieUrl,
		posterLink,
		status,
		settings
	);

	if (existingTFile) {
		const existingContent = await app.vault.read(existingTFile);
		const existingNotesSection = extractNotesSection(existingContent);
		const finalContent = mergeWithExistingNotes(noteContent, existingNotesSection);
		await app.vault.modify(existingTFile, finalContent);
	} else {
		await app.vault.create(filePath, noteContent);
	}
}

async function ensureFolderExists(app: App, folderPath: string): Promise<void> {
	const normalizedPath = normalizePath(folderPath);
	if (!normalizedPath) {
		return;
	}

	const segments = normalizedPath.split('/').filter(Boolean);
	let currentPath = '';

	// Walk path segments and create missing folders incrementally.
	for (const segment of segments) {
		currentPath = currentPath ? `${currentPath}/${segment}` : segment;
		const existing = app.vault.getAbstractFileByPath(currentPath);

		if (!existing) {
			await app.vault.createFolder(currentPath);
			continue;
		}

		if (!(existing instanceof TFile)) {
			continue;
		}

		// A file already occupies the desired folder path; bail out with a clear error.
		throw new Error(`Cannot create folder ${currentPath}: a file with the same name exists.`);
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function getFolderPath(filePath: string): string {
	const parts = normalizePath(filePath).split('/');
	parts.pop();
	const result = parts.join('/');
	return result || '.';
}

export function determineStatus(movie: LetterboxdMovie, sourceName?: string): string {
	const source = sourceName?.toLowerCase() ?? '';
	if (source.endsWith('watchlist.csv')) {
		return 'Want to Watch';
	}
	if (source.endsWith('watched.csv') || source.endsWith('diary.csv')) {
		return 'Watched';
	}
	return movie.watchedDate && movie.watchedDate.trim().length > 0 ? 'Watched' : 'Want to Watch';
}

export function extractNotesSection(content: string): string | null {
	const index = content.indexOf('## Notes');
	if (index === -1) {
		return null;
	}
	return content.slice(index);
}

export function mergeWithExistingNotes(newContent: string, existingNotesSection: string | null): string {
	if (!existingNotesSection) {
		return newContent;
	}
	const markerIndex = newContent.indexOf('## Notes');
	if (markerIndex === -1) {
		return newContent.trimEnd() + '\n\n' + existingNotesSection;
	}
	const prefix = newContent.slice(0, markerIndex);
	return `${prefix}${existingNotesSection}`;
}
