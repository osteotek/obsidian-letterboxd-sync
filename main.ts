import { App, Modal, Notice, Plugin } from 'obsidian';
import { LetterboxdSyncSettings } from './src/types';
import { DEFAULT_SETTINGS, LetterboxdSettingTab } from './src/settings';
import { StatsDisplay } from './src/ui/StatsDisplay';
import { InstructionsBuilder } from './src/ui/InstructionsBuilder';
import { ImportOrchestrator, ImportFile } from './src/ui/ImportOrchestrator';
import { ImportState, ImportStatus } from './src/ui/ImportState';

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

		const importButton = buttonContainer.createEl('button', {
			text: 'Import',
			cls: 'mod-cta'
		});
		importButton.disabled = true;

		const updateImportButtonState = () => {
			if (this.importState.isImporting()) {
				return;
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

			await this.startImport(files, fileSelectors, importButton, cancelButton);
		});

		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});

		cancelButton.addEventListener('click', () => {
			if (this.importState.isImporting()) {
				this.importState.cancel();
				cancelButton.disabled = true;
				cancelButton.setText('Cancelling...');
			} else {
				this.close();
			}
		});
	}

	private async startImport(
		files: ImportFile[],
		fileSelectors: Array<{ key: 'diary' | 'watched' | 'watchlist'; input: HTMLInputElement }>,
		importButton: HTMLButtonElement,
		cancelButton: HTMLButtonElement
	): Promise<void> {
		try {
			// Set up cancellation
			let cancelled = false;
			this.importState.startImport(() => {
				cancelled = true;
			});

			// UI state changes
			importButton.style.display = 'none';
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
			cancelButton.disabled = false;
			cancelButton.setText('Cancel');

			// Run import
			await this.orchestrator.import(files, {
				onProgress: (current, total, movieName, posterUrl) => {
					this.statsDisplay?.updateProgress(current, total, movieName, posterUrl);
				},
				onFileStart: (fileName, fileNum, totalFiles) => {
					this.statsDisplay?.setCurrentFile(fileName);
					this.statsDisplay?.setFileCount(fileNum, totalFiles);
				},
				isCancelled: () => this.importState.getStatus() === ImportStatus.CANCELLED
			});

			if (!cancelled) {
				this.importState.complete();
				this.close();
			} else {
				this.handleImportCancelled(fileSelectors, importButton, cancelButton);
			}
		} catch (error) {
			console.error('Import error:', error);
			new Notice(`Import failed: ${error.message}`);
			this.importState.error();
			this.handleImportCancelled(fileSelectors, importButton, cancelButton);
		}
	}

	private handleImportCancelled(
		fileSelectors: Array<{ input: HTMLInputElement }>,
		importButton: HTMLButtonElement,
		cancelButton: HTMLButtonElement
	): void {
		this.instructionsContainer.style.display = 'block';
		this.fileSelectorsContainer.style.display = 'block';
		this.statsContainer.style.display = 'none';
		importButton.style.display = 'block';
		importButton.disabled = false;
		importButton.setText('Import');
		cancelButton.disabled = false;
		cancelButton.setText('Cancel');
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
