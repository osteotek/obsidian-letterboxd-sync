import { App, Modal, Notice, Plugin } from 'obsidian';
import { LetterboxdSyncSettings } from './src/types';
import { DEFAULT_SETTINGS, LetterboxdSettingTab } from './src/settings';
import { StatsDisplay } from './src/ui/StatsDisplay';
import { InstructionsBuilder } from './src/ui/InstructionsBuilder';
import { ImportOrchestrator, ImportFile } from './src/ui/ImportOrchestrator';
import { ImportState, ImportStatus } from './src/ui/ImportState';
import { validateLetterboxdCSV } from './src/csvParser';
import { SummaryModal } from './src/ui/SummaryModal';

export default class LetterboxdSyncPlugin extends Plugin {
	settings: LetterboxdSyncSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'import-letterboxd-csv',
			name: 'Import Letterboxd CSV',
			callback: () => {
				new ImportModal(this.app, this).open();
			}
		});

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
	private plugin: LetterboxdSyncPlugin;
	private instructionsContainer: HTMLElement;
	private fileSelectorsContainer: HTMLElement;
	private statsContainer: HTMLElement;
	private statsDisplay: StatsDisplay | null = null;
	private importState: ImportState;
	private orchestrator: ImportOrchestrator;
	private importButton: HTMLButtonElement | null = null;
	private cancelButton: HTMLButtonElement | null = null;

	constructor(app: App, plugin: LetterboxdSyncPlugin) {
		super(app);
		this.plugin = plugin;
		this.importState = new ImportState();
		this.orchestrator = new ImportOrchestrator(app, plugin.settings);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Import Letterboxd CSVs', cls: 'letterboxd-modal-title' });

		// Instructions container
		this.instructionsContainer = contentEl.createDiv({ cls: 'letterboxd-instructions' });
		InstructionsBuilder.build(this.instructionsContainer, this.plugin.settings);

		// File selectors container
		this.fileSelectorsContainer = contentEl.createDiv({ cls: 'letterboxd-file-selectors' });

		// Stats container (hidden initially)
		this.statsContainer = contentEl.createDiv({ cls: 'letterboxd-stats' });
		this.statsContainer.style.display = 'none';

		// Setup file selectors and buttons
		this.setupFileSelectors();

		// Setup keyboard shortcuts
		this.setupKeyboardShortcuts();
	}

	private setupFileSelectors(): void {
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

		const buttonContainer = this.fileSelectorsContainer.parentElement!.createDiv({ cls: 'modal-button-container' });

		this.importButton = buttonContainer.createEl('button', {
			text: 'Import',
			cls: 'mod-cta'
		});
		this.importButton.disabled = true;

		const updateImportButtonState = () => {
			if (this.importState.isImporting()) {
				return;
			}
			const hasFile = fileSelectors.some(sel => sel.input.files?.length);
			this.importButton!.disabled = !hasFile;
			if (hasFile) {
				this.importButton!.setText('Import');
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

		this.importButton.addEventListener('click', async () => {
			await this.handleImport(fileSelectors, selectorConfigs);
		});

		this.cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});

		this.cancelButton.addEventListener('click', () => {
			if (this.importState.isImporting()) {
				this.importState.cancel();
				this.cancelButton!.disabled = true;
				this.cancelButton!.setText('Cancelling...');
			} else {
				this.close();
			}
		});
	}

	private async handleImport(
		fileSelectors: Array<{ key: 'diary' | 'watched' | 'watchlist'; input: HTMLInputElement }>,
		selectorConfigs: Array<{ key: 'diary' | 'watched' | 'watchlist'; label: string }>
	): Promise<void> {
		const files: ImportFile[] = selectorConfigs
			.map(cfg => {
				const file = fileSelectors.find(sel => sel.key === cfg.key)?.input.files?.[0];
				return file ? { key: cfg.key, label: cfg.label, file } : null;
			})
			.filter((item): item is ImportFile => Boolean(item));

		if (files.length === 0) {
			new Notice('Please select at least one CSV file.');
			return;
		}

		// Validate all CSV files before starting
		for (const { file, key } of files) {
			const csvContent = await file.text();
			const validation = validateLetterboxdCSV(csvContent);
			
			if (!validation.valid) {
				new Notice(`Invalid ${key}.csv: ${validation.error}`);
				return;
			}
			
			new Notice(`${key}.csv validated: ${validation.movieCount} movies found`);
		}

		await this.startImport(files, fileSelectors);
	}

	private setupKeyboardShortcuts(): void {
		this.scope.register([], 'Enter', (evt) => {
			evt.preventDefault();
			if (!this.importState.isImporting() && this.importButton && !this.importButton.disabled) {
				this.importButton.click();
			}
			return false;
		});

		this.scope.register([], 'Escape', (evt) => {
			evt.preventDefault();
			if (this.cancelButton) {
				this.cancelButton.click();
			}
			return false;
		});
	}

	private async startImport(
		files: ImportFile[],
		fileSelectors: Array<{ key: 'diary' | 'watched' | 'watchlist'; input: HTMLInputElement }>
	): Promise<void> {
		try {
			// Set up cancellation
			let cancelled = false;
			this.importState.startImport(() => {
				cancelled = true;
			});

			// UI state changes
			this.importButton!.style.display = 'none';
			fileSelectors.forEach(({ input }) => {
				input.disabled = true;
			});

			// Show stats, hide instructions
			this.instructionsContainer.style.display = 'none';
			this.fileSelectorsContainer.style.display = 'none';
			this.statsContainer.style.display = 'block';

			// Initialize stats display
			this.statsDisplay = new StatsDisplay(this.statsContainer);
			this.statsDisplay.setFileCount(1, files.length);
			this.statsDisplay.startTimer();

			// Reset cancel button
			this.cancelButton!.disabled = false;
			this.cancelButton!.setText('Cancel');

			// Run import
			await this.orchestrator.import(files, {
				onProgress: (current, total, movieName, posterUrl, success) => {
					this.statsDisplay?.updateProgress(current, total, movieName, posterUrl);
					if (success === true) {
						this.statsDisplay?.incrementSuccess();
					} else if (success === false) {
						this.statsDisplay?.incrementError();
					}
				},
				onFileStart: (fileName, fileNum, totalFiles) => {
					this.statsDisplay?.setCurrentFile(fileName);
					this.statsDisplay?.setFileCount(fileNum, totalFiles);
				},
				isCancelled: () => this.importState.getStatus() === ImportStatus.CANCELLED
			});

			if (!cancelled) {
				this.importState.complete();
				this.showSummaryAndClose();
			} else {
				this.handleImportCancelled(fileSelectors);
			}
		} catch (error) {
			console.error('Import error:', error);
			new Notice(`Import failed: ${error.message}`);
			this.importState.error();
			this.handleImportCancelled(fileSelectors);
		}
	}

	private showSummaryAndClose(): void {
		if (!this.statsDisplay) {
			this.close();
			return;
		}

		const stats = this.statsDisplay.getStats();
		const timeElapsed = this.statsDisplay.elements.timeElapsed?.getText() || '0s';
		
		this.close();
		
		// Show summary modal
		new SummaryModal(this.app, {
			success: stats.success,
			error: stats.error,
			timeElapsed: timeElapsed,
			cancelled: false
		}).open();
	}

	private handleImportCancelled(
		fileSelectors: Array<{ input: HTMLInputElement }>
	): void {
		if (this.statsDisplay) {
			const stats = this.statsDisplay.getStats();
			const timeElapsed = this.statsDisplay.elements.timeElapsed?.getText() || '0s';
			
			// Show summary for cancelled import
			new SummaryModal(this.app, {
				success: stats.success,
				error: stats.error,
				timeElapsed: timeElapsed,
				cancelled: true
			}).open();
		}

		this.instructionsContainer.style.display = 'block';
		this.fileSelectorsContainer.style.display = 'block';
		this.statsContainer.style.display = 'none';
		this.importButton!.style.display = 'block';
		this.importButton!.disabled = false;
		this.importButton!.setText('Import');
		this.cancelButton!.disabled = false;
		this.cancelButton!.setText('Cancel');
		fileSelectors.forEach(({ input }) => {
			input.disabled = false;
		});
		this.importState.reset();
	}

	onClose() {
		// Cancel import if one is in progress
		if (this.importState.isImporting()) {
			this.importState.cancel();
		}

		// Cleanup stats display
		if (this.statsDisplay) {
			this.statsDisplay.cleanup();
			this.statsDisplay = null;
		}

		this.contentEl.empty();
	}
}
function isSupportedCsv(fileName: string, expected?: 'diary' | 'watched' | 'watchlist'): boolean {
const lower = fileName.toLowerCase();
if (expected) {
return lower.endsWith(`${expected}.csv`);
}
return lower.endsWith('diary.csv') || lower.endsWith('watched.csv') || lower.endsWith('watchlist.csv');
}
