import { App, Modal, Notice, Plugin } from 'obsidian';
import { LetterboxdSyncSettings } from './src/types';
import { DEFAULT_SETTINGS, LetterboxdSettingTab } from './src/settings';
import { importLetterboxdCSV } from './src/importer';

export default class LetterboxdSyncPlugin extends Plugin {
	settings: LetterboxdSyncSettings;

	async onload() {
		await this.loadSettings();

		// Add command to import CSV
		this.addCommand({
			id: 'import-letterboxd-csv',
			name: 'Import Letterboxd CSV',
			callback: () => {
				new ImportModal(this.app, this).open();
			}
		});

		// Add settings tab
		this.addSettingTab(new LetterboxdSettingTab(this.app, this));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ImportModal extends Modal {
	plugin: LetterboxdSyncPlugin;
	instructionsContainer: HTMLElement;
	fileSelectorsContainer: HTMLElement;
	statsContainer: HTMLElement;
	progressBarElement: HTMLElement;
	posterElement: HTMLImageElement;
	statsElements: {
		currentFile?: HTMLElement;
		progress?: HTMLElement;
		currentMovie?: HTMLElement;
		filesProcessed?: HTMLElement;
		moviesProcessed?: HTMLElement;
		timeElapsed?: HTMLElement;
		timeRemaining?: HTMLElement;
	};
	startTime: number;
	timerHandle: number | null;
	isActive: boolean;
	totalMovies: number;
	processedMovies: number;
	isImporting: boolean;
	cancelImport: (() => void) | null;

	constructor(app: App, plugin: LetterboxdSyncPlugin) {
		super(app);
		this.plugin = plugin;
		this.statsElements = {};
		this.startTime = 0;
		this.timerHandle = null;
		this.isActive = true;
		this.totalMovies = 0;
		this.processedMovies = 0;
		this.isImporting = false;
		this.cancelImport = null;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Import Letterboxd CSVs', cls: 'letterboxd-modal-title' });

		// Instructions container (will be hidden during import)
		this.instructionsContainer = contentEl.createDiv({ cls: 'letterboxd-instructions' });

		// Introduction card
		const introCard = this.instructionsContainer.createDiv({ cls: 'letterboxd-info-card' });
		introCard.createEl('div', { 
			text: '📥 Getting Started', 
			cls: 'letterboxd-info-card-title' 
		});
		introCard.createEl('p', {
			text: 'Import your Letterboxd viewing history into Obsidian. Select one or more CSV files from your Letterboxd data export.',
			cls: 'letterboxd-info-card-text'
		});

		// Steps card
		const stepsCard = this.instructionsContainer.createDiv({ cls: 'letterboxd-info-card' });
		stepsCard.createEl('div', { 
			text: '📋 Export Instructions', 
			cls: 'letterboxd-info-card-title' 
		});
		const stepsContainer = stepsCard.createDiv({ cls: 'letterboxd-steps-container' });
		
		const step1 = stepsContainer.createDiv({ cls: 'letterboxd-step' });
		step1.createEl('span', { text: '1', cls: 'letterboxd-step-number' });
		step1.createEl('span', { 
			text: 'Go to Letterboxd → Settings → Data → Export', 
			cls: 'letterboxd-step-text' 
		});

		const step2 = stepsContainer.createDiv({ cls: 'letterboxd-step' });
		step2.createEl('span', { text: '2', cls: 'letterboxd-step-number' });
		step2.createEl('span', { 
			text: 'Unzip the download and locate diary.csv, watched.csv, and watchlist.csv', 
			cls: 'letterboxd-step-text' 
		});

		const step3 = stepsContainer.createDiv({ cls: 'letterboxd-step' });
		step3.createEl('span', { text: '3', cls: 'letterboxd-step-number' });
		step3.createEl('span', { 
			text: 'Select any combination below and click Import', 
			cls: 'letterboxd-step-text' 
		});

		// Settings card
		const settingsCard = this.instructionsContainer.createDiv({ cls: 'letterboxd-info-card' });
		settingsCard.createEl('div', { 
			text: '⚙️ Current Settings', 
			cls: 'letterboxd-info-card-title' 
		});
		
		const settingsGrid = settingsCard.createDiv({ cls: 'letterboxd-settings-grid' });
		
		const notesItem = settingsGrid.createDiv({ cls: 'letterboxd-settings-item' });
		notesItem.createEl('span', { text: 'Notes Folder', cls: 'letterboxd-settings-label' });
		notesItem.createEl('span', { 
			text: this.plugin.settings.outputFolder || 'Not set', 
			cls: 'letterboxd-settings-value' 
		});

		const postersItem = settingsGrid.createDiv({ cls: 'letterboxd-settings-item' });
		postersItem.createEl('span', { text: 'Posters', cls: 'letterboxd-settings-label' });
		const posterText = this.plugin.settings.downloadPosters
			? `Download to ${this.plugin.settings.posterFolder}`
			: 'Link to online images';
		postersItem.createEl('span', { 
			text: posterText, 
			cls: 'letterboxd-settings-value' 
		});

		const statusItem = settingsGrid.createDiv({ cls: 'letterboxd-settings-item' });
		statusItem.createEl('span', { text: 'Status Rules', cls: 'letterboxd-settings-label' });
		statusItem.createEl('span', { 
			text: 'Diary/Watched → Watched, Watchlist → Want to Watch', 
			cls: 'letterboxd-settings-value' 
		});

		// File selectors container (will be hidden during import)
		this.fileSelectorsContainer = contentEl.createDiv({ cls: 'letterboxd-file-selectors' });

		// Stats container (hidden initially, shown during import)
		this.statsContainer = contentEl.createDiv({ cls: 'letterboxd-stats' });
		this.statsContainer.style.display = 'none';
		this.buildStatsUI();

		const selectorConfigs = [
			{ key: 'diary' as const, label: 'Diary entries (diary.csv)' },
			{ key: 'watched' as const, label: 'Watched log (watched.csv)' },
			{ key: 'watchlist' as const, label: 'Watchlist (watchlist.csv)' }
		];

		const fileSelectors: Array<{ key: typeof selectorConfigs[number]['key']; input: HTMLInputElement }> = [];

		for (const { key, label } of selectorConfigs) {
			const settingItem = this.fileSelectorsContainer.createDiv({ cls: 'setting-item' });
			const info = settingItem.createDiv({ cls: 'setting-item-info' });
			info.createEl('div', { text: label });
			info.createEl('div', {
				cls: 'setting-item-description',
				text: `Optional. Select ${key}.csv if you want to import it.`
			});
			const control = settingItem.createDiv({ cls: 'setting-item-control' });
			const input = control.createEl('input', { attr: { type: 'file', accept: '.csv' } });
			fileSelectors.push({ key, input });
		}

		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

		const importButton = buttonContainer.createEl('button', {
			text: 'Import',
			cls: 'mod-cta'
		});
		importButton.disabled = true;

		let cancelled = false;

		const updateImportButtonState = () => {
			if (this.isImporting) {
				return; // Don't update button state while importing
			}
			const hasFile = fileSelectors.some(sel => sel.input.files?.length);
			importButton.disabled = !hasFile;
			if (hasFile) {
				importButton.setText('Import');
			}
		};

		fileSelectors.forEach(({ input, key }) => {
			input.addEventListener('change', () => {
				const file = input.files?.[0];
				if (file && !isSupportedCsv(file.name, key)) {
					new Notice(`Please select ${key}.csv for this field.`);
					input.value = '';
				}
				updateImportButtonState();
			});
		});
		updateImportButtonState();

		importButton.addEventListener('click', async () => {
			const queue = selectorConfigs
				.map(cfg => {
					const file = fileSelectors.find(sel => sel.key === cfg.key)?.input.files?.[0];
					return file ? { cfg, file } : null;
				})
				.filter((item): item is { cfg: typeof selectorConfigs[number]; file: File } => Boolean(item));

			if (queue.length === 0) {
				new Notice('Please select at least one CSV file.');
				return;
			}

			try {
				this.isImporting = true;
				cancelled = false;
				
				// Set up cancel function
				this.cancelImport = () => {
					cancelled = true;
				};
				
				// Check if both diary and watched are selected - need to deduplicate
				const hasDiary = queue.some(item => item.cfg.key === 'diary');
				const hasWatched = queue.some(item => item.cfg.key === 'watched');
				let diaryMovies: Set<string> | null = null;
				
				if (hasDiary && hasWatched) {
					// Parse diary.csv to get list of movies to exclude from watched.csv
					const diaryFile = queue.find(item => item.cfg.key === 'diary')?.file;
					if (diaryFile) {
						const diaryContent = await diaryFile.text();
						const { parseLetterboxdCSV } = await import('./src/csvParser');
						const parsed = parseLetterboxdCSV(diaryContent);
						// Create a Set of unique movie identifiers (name + year)
						diaryMovies = new Set(parsed.map(m => `${m.name}|${m.year}`));
					}
				}
				
				// Hide import button during import
				importButton.style.display = 'none';
				
				// Disable file selectors during import
				fileSelectors.forEach(({ input }) => {
					input.disabled = true;
				});

				// Hide instructions, file selectors and show stats
				this.instructionsContainer.style.display = 'none';
				this.fileSelectorsContainer.style.display = 'none';
				this.statsContainer.style.display = 'block';
				this.startTime = Date.now();
				
				// Initialize file counter
				if (this.statsElements.filesProcessed) {
					this.statsElements.filesProcessed.setText(`1/${queue.length}`);
				}
				
				this.updateTimeElapsed();

				for (let i = 0; i < queue.length; i++) {
					const { cfg, file } = queue[i];
					
					// Update current file being processed
					if (this.statsElements.currentFile) {
						this.statsElements.currentFile.setText(cfg.label);
					}
					
					// Update file counter to show current file
					if (this.statsElements.filesProcessed) {
						this.statsElements.filesProcessed.setText(`${i + 1}/${queue.length}`);
					}

					const csvContent = await file.text();
					
					// Determine if we should exclude movies for this file
					const excludeMovies = (cfg.key === 'watched' && diaryMovies) ? diaryMovies : undefined;
					
					await importLetterboxdCSV(
						this.app,
						csvContent,
						this.plugin.settings,
						{
							sourceName: `${cfg.key}.csv`,
							onProgress: (current, total, movieName, posterUrl) => {
								this.updateStats(current, total, movieName, posterUrl);
							},
							isCancelled: () => cancelled,
							excludeMovies
						}
					);

					if (cancelled) {
						break;
					}
				}

				if (!cancelled) {
					this.close();
				} else {
					// Show instructions and file selectors again if cancelled
					this.instructionsContainer.style.display = 'block';
					this.fileSelectorsContainer.style.display = 'block';
					this.statsContainer.style.display = 'none';
					importButton.style.display = 'block';
					importButton.disabled = false;
					importButton.setText('Import');
					cancelButton.disabled = false;
					// Re-enable file selectors
					fileSelectors.forEach(({ input }) => {
						input.disabled = false;
					});
				}
			} catch (error) {
				console.error('Import error:', error);
				new Notice(`Import failed: ${error.message}`);
				// Show instructions and file selectors again on error
				this.instructionsContainer.style.display = 'block';
				this.fileSelectorsContainer.style.display = 'block';
				this.statsContainer.style.display = 'none';
				importButton.style.display = 'block';
				importButton.disabled = false;
				importButton.setText('Import');
				// Re-enable file selectors
				fileSelectors.forEach(({ input }) => {
					input.disabled = false;
				});
			} finally {
				this.isImporting = false;
				this.cancelImport = null;
			}
		});

		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});

		cancelButton.addEventListener('click', () => {
			if (this.isImporting && this.cancelImport) {
				this.cancelImport();
				cancelButton.disabled = true;
				cancelButton.setText('Cancelling...');
			} else {
				this.close();
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		this.isActive = false;
		
		// Cancel import if one is in progress
		if (this.isImporting && this.cancelImport) {
			this.cancelImport();
		}
		
		// Clear timer to prevent memory leak
		if (this.timerHandle !== null) {
			window.clearTimeout(this.timerHandle);
			this.timerHandle = null;
		}
		
		contentEl.empty();
	}

	buildStatsUI() {
		this.statsContainer.createEl('h3', { text: 'Import Progress', cls: 'letterboxd-stats-title' });

		const statsGrid = this.statsContainer.createDiv({ cls: 'letterboxd-stats-grid' });

		// Poster display (wide card at top)
		const posterCard = statsGrid.createDiv({ cls: 'letterboxd-stat-card letterboxd-stat-card-wide letterboxd-poster-card' });
		posterCard.createEl('div', { text: 'Current Movie', cls: 'letterboxd-stat-label' });
		const posterContainer = posterCard.createDiv({ cls: 'letterboxd-poster-container' });
		this.posterElement = posterContainer.createEl('img', { 
			cls: 'letterboxd-poster-image',
			attr: { alt: 'Movie Poster' }
		});
		this.posterElement.style.display = 'none'; // Hidden initially

		// Current file being processed
		const currentFileCard = statsGrid.createDiv({ cls: 'letterboxd-stat-card' });
		currentFileCard.createEl('div', { text: 'Current File', cls: 'letterboxd-stat-label' });
		this.statsElements.currentFile = currentFileCard.createEl('div', { 
			text: 'Initializing...', 
			cls: 'letterboxd-stat-value letterboxd-stat-file' 
		});

		// Current file number (right next to Current File)
		const filesCard = statsGrid.createDiv({ cls: 'letterboxd-stat-card' });
		filesCard.createEl('div', { text: 'File', cls: 'letterboxd-stat-label' });
		this.statsElements.filesProcessed = filesCard.createEl('div', { 
			text: '0/0', 
			cls: 'letterboxd-stat-value' 
		});

		// Progress bar card
		const progressCard = statsGrid.createDiv({ cls: 'letterboxd-stat-card letterboxd-stat-card-wide' });
		progressCard.createEl('div', { text: 'Progress', cls: 'letterboxd-stat-label' });
		this.statsElements.progress = progressCard.createEl('div', { 
			text: '0/0', 
			cls: 'letterboxd-stat-value letterboxd-stat-progress' 
		});
		const progressBarContainer = progressCard.createDiv({ cls: 'letterboxd-progress-bar-container' });
		this.progressBarElement = progressBarContainer.createDiv({ cls: 'letterboxd-progress-bar' });
		this.progressBarElement.style.width = '0%';
		this.statsElements.currentMovie = progressCard.createEl('div', { 
			text: 'Waiting...', 
			cls: 'letterboxd-stat-movie' 
		});

		// Time elapsed
		const timeCard = statsGrid.createDiv({ cls: 'letterboxd-stat-card' });
		timeCard.createEl('div', { text: 'Time Elapsed', cls: 'letterboxd-stat-label' });
		this.statsElements.timeElapsed = timeCard.createEl('div', { 
			text: '0s', 
			cls: 'letterboxd-stat-value' 
		});

		// Time remaining
		const timeRemainingCard = statsGrid.createDiv({ cls: 'letterboxd-stat-card' });
		timeRemainingCard.createEl('div', { text: 'Time Remaining', cls: 'letterboxd-stat-label' });
		this.statsElements.timeRemaining = timeRemainingCard.createEl('div', { 
			text: 'Calculating...', 
			cls: 'letterboxd-stat-value' 
		});
	}

	updateStats(current: number, total: number, movieName: string, posterUrl?: string) {
		this.processedMovies = current;
		this.totalMovies = total;

		if (this.statsElements.progress) {
			this.statsElements.progress.setText(`${current}/${total}`);
		}

		if (this.statsElements.currentMovie) {
			this.statsElements.currentMovie.setText(movieName);
		}

		// Update poster
		if (posterUrl) {
			this.posterElement.src = posterUrl;
			this.posterElement.style.display = 'block';
		} else {
			this.posterElement.style.display = 'none';
		}

		// Update progress bar
		if (this.progressBarElement && total > 0) {
			const percentage = (current / total) * 100;
			this.progressBarElement.style.width = `${percentage}%`;
		}

		// Update time remaining
		this.updateTimeRemaining();
	}

	updateTimeElapsed() {
		if (!this.isActive || !this.statsElements.timeElapsed || this.startTime === 0) {
			return;
		}
		
		const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
		const minutes = Math.floor(elapsed / 60);
		const seconds = elapsed % 60;
		const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
		this.statsElements.timeElapsed.setText(timeStr);
		
		// Update time remaining as well
		this.updateTimeRemaining();
		
		// Schedule next update only if modal is still active
		if (this.isActive) {
			this.timerHandle = window.setTimeout(() => this.updateTimeElapsed(), 1000);
		}
	}

	updateTimeRemaining() {
		if (!this.statsElements.timeRemaining || this.startTime === 0) {
			return;
		}

		// Need at least a few processed items to make a reasonable estimate
		if (this.processedMovies < 2 || this.totalMovies === 0) {
			this.statsElements.timeRemaining.setText('Calculating...');
			return;
		}

		const elapsed = (Date.now() - this.startTime) / 1000; // in seconds
		const avgTimePerMovie = elapsed / this.processedMovies;
		const remainingMovies = this.totalMovies - this.processedMovies;
		const estimatedSecondsRemaining = Math.ceil(avgTimePerMovie * remainingMovies);

		if (estimatedSecondsRemaining < 1) {
			this.statsElements.timeRemaining.setText('Almost done!');
			return;
		}

		const minutes = Math.floor(estimatedSecondsRemaining / 60);
		const seconds = estimatedSecondsRemaining % 60;
		
		let timeStr: string;
		if (minutes > 0) {
			timeStr = `~${minutes}m ${seconds}s`;
		} else {
			timeStr = `~${seconds}s`;
		}
		
		this.statsElements.timeRemaining.setText(timeStr);
	}
}

function isSupportedCsv(fileName: string, expected?: 'diary' | 'watched' | 'watchlist'): boolean {
	const lower = fileName.toLowerCase();
	if (expected) {
		return lower.endsWith(`${expected}.csv`);
	}
	return lower.endsWith('diary.csv') || lower.endsWith('watched.csv') || lower.endsWith('watchlist.csv');
}
