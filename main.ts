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
	statsElements: {
		currentFile?: HTMLElement;
		progress?: HTMLElement;
		currentMovie?: HTMLElement;
		filesProcessed?: HTMLElement;
		moviesProcessed?: HTMLElement;
		timeElapsed?: HTMLElement;
	};
	startTime: number;
	timerHandle: number | null;
	isActive: boolean;

	constructor(app: App, plugin: LetterboxdSyncPlugin) {
		super(app);
		this.plugin = plugin;
		this.statsElements = {};
		this.startTime = 0;
		this.timerHandle = null;
		this.isActive = true;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Import Letterboxd CSVs' });

		// Instructions container (will be hidden during import)
		this.instructionsContainer = contentEl.createDiv({ cls: 'letterboxd-instructions' });

		this.instructionsContainer.createEl('p', {
			text: 'Attach diary.csv, watched.csv, and/or watchlist.csv from your export. Selected files import sequentially using the settings below.'
		}).addClass('setting-item-description');

		const stepsList = this.instructionsContainer.createEl('ol');
		stepsList.addClass('letterboxd-import-steps');
		stepsList.createEl('li', { text: 'Export your data at Letterboxd → Settings → Data → Export.' });
		stepsList.createEl('li', { text: 'Unzip the download and grab diary.csv, watched.csv, and watchlist.csv as needed.' });
		stepsList.createEl('li', { text: 'Select any combination below. They import in the order shown.' });

		const summary = this.instructionsContainer.createDiv({ cls: 'letterboxd-summary' });
		summary.createEl('h3', { text: 'Current settings' });
		const summaryList = summary.createEl('ul');
		summaryList.createEl('li', { text: `Notes folder: ${this.plugin.settings.outputFolder || 'Not set'}` });
		const posterSummary = this.plugin.settings.downloadPosters
			? `Posters will be saved to ${this.plugin.settings.posterFolder || 'the configured attachments folder'}.`
			: 'Posters will remain on Letterboxd; notes will link to the online image.';
		summaryList.createEl('li', { text: posterSummary });
		summaryList.createEl('li', {
			text: 'Status rules: diary & watched imports → Watched, watchlist import → Want to Watch, others use the watched date.'
		});
		summaryList.createEl('li', {
			text: 'Supported files: diary.csv, watched.csv, watchlist.csv (select any combination).'
		});

		this.instructionsContainer.createEl('p', {
			text: 'Leave a selector empty to skip that dataset.'
		}).addClass('setting-item-description');

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

		let isImporting = false;
		let cancelled = false;

		const updateImportButtonState = () => {
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
				isImporting = true;
				cancelled = false;
				importButton.disabled = true;
				importButton.setText('Importing...');

				// Hide instructions, file selectors and show stats
				this.instructionsContainer.style.display = 'none';
				this.fileSelectorsContainer.style.display = 'none';
				this.statsContainer.style.display = 'block';
				this.startTime = Date.now();
				this.updateTimeElapsed();

				let totalMoviesProcessed = 0;
				let filesProcessedCount = 0;

				for (const { cfg, file } of queue) {
					if (this.statsElements.currentFile) {
						this.statsElements.currentFile.setText(cfg.label);
					}

					const csvContent = await file.text();
					await importLetterboxdCSV(
						this.app,
						csvContent,
						this.plugin.settings,
						{
							sourceName: `${cfg.key}.csv`,
							onProgress: (current, total, movieName) => {
								this.updateStats(current, total, movieName, filesProcessedCount, totalMoviesProcessed);
							},
							isCancelled: () => cancelled
						}
					);

					if (cancelled) {
						break;
					}

					filesProcessedCount++;
					totalMoviesProcessed += parseInt(this.statsElements.progress?.getText().split('/')[0] || '0');
					
					if (this.statsElements.filesProcessed) {
						this.statsElements.filesProcessed.setText(`${filesProcessedCount}/${queue.length}`);
					}
				}

				if (!cancelled) {
					this.close();
				} else {
					// Show instructions and file selectors again if cancelled
					this.instructionsContainer.style.display = 'block';
					this.fileSelectorsContainer.style.display = 'block';
					this.statsContainer.style.display = 'none';
					importButton.disabled = false;
					importButton.setText('Import');
					cancelButton.disabled = false;
				}
			} catch (error) {
				console.error('Import error:', error);
				new Notice(`Import failed: ${error.message}`);
				// Show instructions and file selectors again on error
				this.instructionsContainer.style.display = 'block';
				this.fileSelectorsContainer.style.display = 'block';
				this.statsContainer.style.display = 'none';
				importButton.disabled = false;
				importButton.setText('Import');
			} finally {
				isImporting = false;
			}
		});

		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});

		cancelButton.addEventListener('click', () => {
			if (isImporting) {
				cancelled = true;
				cancelButton.disabled = true;
				importButton.setText('Cancelling...');
			} else {
				this.close();
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	buildStatsUI() {
		this.statsContainer.createEl('h3', { text: 'Import Progress', cls: 'letterboxd-stats-title' });

		const statsGrid = this.statsContainer.createDiv({ cls: 'letterboxd-stats-grid' });

		// Current file being processed
		const currentFileCard = statsGrid.createDiv({ cls: 'letterboxd-stat-card' });
		currentFileCard.createEl('div', { text: 'Current File', cls: 'letterboxd-stat-label' });
		this.statsElements.currentFile = currentFileCard.createEl('div', { 
			text: 'Initializing...', 
			cls: 'letterboxd-stat-value letterboxd-stat-file' 
		});

		// Progress bar card
		const progressCard = statsGrid.createDiv({ cls: 'letterboxd-stat-card letterboxd-stat-card-wide' });
		progressCard.createEl('div', { text: 'Progress', cls: 'letterboxd-stat-label' });
		this.statsElements.progress = progressCard.createEl('div', { 
			text: '0/0', 
			cls: 'letterboxd-stat-value letterboxd-stat-progress' 
		});
		const progressBarContainer = progressCard.createDiv({ cls: 'letterboxd-progress-bar-container' });
		const progressBar = progressBarContainer.createDiv({ cls: 'letterboxd-progress-bar' });
		progressBar.style.width = '0%';
		this.statsElements.currentMovie = progressCard.createEl('div', { 
			text: 'Waiting...', 
			cls: 'letterboxd-stat-movie' 
		});

		// Files processed
		const filesCard = statsGrid.createDiv({ cls: 'letterboxd-stat-card' });
		filesCard.createEl('div', { text: 'Files Processed', cls: 'letterboxd-stat-label' });
		this.statsElements.filesProcessed = filesCard.createEl('div', { 
			text: '0/0', 
			cls: 'letterboxd-stat-value' 
		});

		// Time elapsed
		const timeCard = statsGrid.createDiv({ cls: 'letterboxd-stat-card' });
		timeCard.createEl('div', { text: 'Time Elapsed', cls: 'letterboxd-stat-label' });
		this.statsElements.timeElapsed = timeCard.createEl('div', { 
			text: '0s', 
			cls: 'letterboxd-stat-value' 
		});
	}

	updateStats(current: number, total: number, movieName: string, filesProcessed: number, totalMoviesProcessed: number) {
		if (this.statsElements.progress) {
			this.statsElements.progress.setText(`${current}/${total}`);
		}

		if (this.statsElements.currentMovie) {
			this.statsElements.currentMovie.setText(movieName);
		}

		// Update progress bar
		const progressBar = this.statsContainer.querySelector('.letterboxd-progress-bar') as HTMLElement;
		if (progressBar && total > 0) {
			const percentage = (current / total) * 100;
			progressBar.style.width = `${percentage}%`;
		}

		this.updateTimeElapsed();
	}

	updateTimeElapsed() {
		if (this.statsElements.timeElapsed && this.startTime > 0) {
			const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
			const minutes = Math.floor(elapsed / 60);
			const seconds = elapsed % 60;
			const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
			this.statsElements.timeElapsed.setText(timeStr);
			
			// Schedule next update
			setTimeout(() => this.updateTimeElapsed(), 1000);
		}
	}
}

function isSupportedCsv(fileName: string, expected?: 'diary' | 'watched' | 'watchlist'): boolean {
	const lower = fileName.toLowerCase();
	if (expected) {
		return lower.endsWith(`${expected}.csv`);
	}
	return lower.endsWith('diary.csv') || lower.endsWith('watched.csv') || lower.endsWith('watchlist.csv');
}
