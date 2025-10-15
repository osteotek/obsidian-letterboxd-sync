import { App } from 'obsidian';
import { LetterboxdSyncSettings } from '../types';
import { importLetterboxdCSV } from '../importer';
import { parseLetterboxdCSV } from '../csvParser';

export interface ImportFile {
	key: 'diary' | 'watched' | 'watchlist';
	label: string;
	file: File;
}

export interface ImportCallbacks {
	onProgress?: (current: number, total: number, movieName: string, posterUrl?: string, success?: boolean) => void;
	onFileStart?: (fileName: string, fileNumber: number, totalFiles: number) => void;
	isCancelled?: () => boolean;
}

/**
 * Orchestrates the import process with deduplication logic
 */
export class ImportOrchestrator {
	constructor(
		private app: App,
		private settings: LetterboxdSyncSettings
	) {}

	async import(files: ImportFile[], callbacks: ImportCallbacks): Promise<void> {
		// Check for diary + watched combination requiring deduplication
		const diaryMovies = await this.getDiaryMoviesForDeduplication(files);

		// Process each file
		for (let i = 0; i < files.length; i++) {
			const { key, label, file } = files[i];

			// Notify file start
			if (callbacks.onFileStart) {
				callbacks.onFileStart(label, i + 1, files.length);
			}

			// Check if cancelled
			if (callbacks.isCancelled?.()) {
				break;
			}

			// Read file content
			const csvContent = await file.text();

			// Determine exclusions for watched.csv
			const excludeMovies = (key === 'watched' && diaryMovies) ? diaryMovies : undefined;

			// Import the file
			await importLetterboxdCSV(
				this.app,
				csvContent,
				this.settings,
				{
					sourceName: `${key}.csv`,
					onProgress: callbacks.onProgress,
					isCancelled: callbacks.isCancelled,
					excludeMovies
				}
			);
		}
	}

	private async getDiaryMoviesForDeduplication(files: ImportFile[]): Promise<Set<string> | null> {
		const hasDiary = files.some(f => f.key === 'diary');
		const hasWatched = files.some(f => f.key === 'watched');

		if (!hasDiary || !hasWatched) {
			return null;
		}

		const diaryFile = files.find(f => f.key === 'diary')?.file;
		if (!diaryFile) {
			return null;
		}

		try {
			const diaryContent = await diaryFile.text();
			const parsed = parseLetterboxdCSV(diaryContent);
			return new Set(parsed.map(m => `${m.name}|${m.year}`));
		} catch (error) {
			console.error('Failed to parse diary for deduplication:', error);
			return null;
		}
	}
}
