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

				// Check if poster already exists
				const existingPoster = app.vault.getAbstractFileByPath(posterFullPath);
				if (!existingPoster) {
					const posterData = await downloadPoster(pageData.posterUrl);
					if (posterData) {
						await app.vault.createBinary(posterFullPath, posterData);
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
	const folder = app.vault.getAbstractFileByPath(folderPath);
	if (!folder) {
		await app.vault.createFolder(folderPath);
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
