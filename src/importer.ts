import { App, Notice, TFile, normalizePath } from 'obsidian';
import { LetterboxdMovie, LetterboxdSyncSettings, MovieMetadata } from './types';
import { parseLetterboxdCSV } from './csvParser';
import { fetchMoviePageData, downloadPoster } from './posterFetcher';
import { generateMovieNote, sanitizeFileName } from './noteGenerator';

export async function importLetterboxdCSV(
	app: App,
	csvContent: string,
	settings: LetterboxdSyncSettings,
	onProgress?: (current: number, total: number, movie: string) => void
): Promise<void> {
	try {
		// Parse CSV
		const movies = parseLetterboxdCSV(csvContent);
		
		if (movies.length === 0) {
			new Notice('No movies found in CSV file');
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

		for (let i = 0; i < movies.length; i++) {
			const movie = movies[i];
			
			if (onProgress) {
				onProgress(i + 1, movies.length, movie.name);
			}

			try {
				await importMovie(app, movie, settings);
				successCount++;
			} catch (error) {
				console.error(`Failed to import ${movie.name}:`, error);
				failCount++;
			}

			// Small delay to avoid overwhelming the system
			await sleep(100);
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
	settings: LetterboxdSyncSettings
): Promise<void> {
	const fileName = sanitizeFileName(`${movie.name} (${movie.year})`);
	const filePath = normalizePath(`${settings.outputFolder}/${fileName}.md`);

	// Check if file already exists
	const existingFile = app.vault.getAbstractFileByPath(filePath);
	if (existingFile instanceof TFile) {
		console.log(`File already exists: ${filePath}`);
		return;
	}

	let posterPath: string | undefined;
	let metadata: MovieMetadata | undefined;
	let resolvedMovieUrl: string | undefined;

	// Fetch movie page data (poster and metadata) if enabled
	if (movie.letterboxdUri) {
		try {
			const pageData = await fetchMoviePageData(movie.letterboxdUri);
			metadata = pageData.metadata;
			resolvedMovieUrl = pageData.movieUrl ?? undefined;
			
			// Download poster if enabled
			if (settings.downloadPosters && pageData.posterUrl) {
				const posterFileName = sanitizeFileName(`${movie.name}_${movie.year}.jpg`);
				posterPath = `${settings.posterFolder}/${posterFileName}`;
				const posterFullPath = normalizePath(posterPath);
				const posterFolderPath = getFolderPath(posterFullPath);

				// Avoid redundant downloads when the attachment already lives in the vault.
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
			// Continue without poster and metadata
		}
	}

	// Generate note content with metadata
	const noteContent = generateMovieNote(movie, posterPath, metadata, resolvedMovieUrl);

	// Create the note
	await app.vault.create(filePath, noteContent);
}

async function ensureFolderExists(app: App, folderPath: string): Promise<void> {
	const normalizedPath = normalizePath(folderPath);
	if (!normalizedPath) {
		return;
	}

	const segments = normalizedPath.split('/').filter(Boolean);
	let currentPath = '';

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

		throw new Error(`Cannot create folder ${currentPath}: a file with the same name exists.`);
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function getFolderPath(filePath: string): string {
	const parts = normalizePath(filePath).split('/');
	parts.pop();
	return parts.join('/');
}
