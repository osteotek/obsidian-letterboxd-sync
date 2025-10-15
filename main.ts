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

	constructor(app: App, plugin: LetterboxdSyncPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Import Letterboxd CSVs' });

		contentEl.createEl('p', {
			text: 'Attach diary.csv, watched.csv, and/or watchlist.csv from your export. Selected files import sequentially using the settings below.'
		}).addClass('setting-item-description');

		const stepsList = contentEl.createEl('ol');
		stepsList.addClass('letterboxd-import-steps');
		stepsList.createEl('li', { text: 'Export your data at Letterboxd → Settings → Data → Export.' });
		stepsList.createEl('li', { text: 'Unzip the download and grab diary.csv, watched.csv, and watchlist.csv as needed.' });
		stepsList.createEl('li', { text: 'Select any combination below. They import in the order shown.' });

		const summary = contentEl.createDiv({ cls: 'letterboxd-summary' });
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

		contentEl.createEl('p', {
			text: 'Leave a selector empty to skip that dataset.'
		}).addClass('setting-item-description');

		const selectorConfigs = [
			{ key: 'diary' as const, label: 'Diary entries (diary.csv)' },
			{ key: 'watched' as const, label: 'Watched log (watched.csv)' },
			{ key: 'watchlist' as const, label: 'Watchlist (watchlist.csv)' }
		];

		const fileSelectors: Array<{ key: typeof selectorConfigs[number]['key']; input: HTMLInputElement }> = [];

		for (const { key, label } of selectorConfigs) {
			const settingItem = contentEl.createDiv({ cls: 'setting-item' });
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

				for (const { cfg, file } of queue) {
					const csvContent = await file.text();
					await importLetterboxdCSV(
						this.app,
						csvContent,
						this.plugin.settings,
						{
							sourceName: `${cfg.key}.csv`,
							onProgress: (current, total, movieName) => {
								importButton.setText(`Importing ${cfg.label}: ${current}/${total} – ${movieName}...`);
							},
							isCancelled: () => cancelled
						}
					);

					if (cancelled) {
						break;
					}
				}

				if (!cancelled) {
					this.close();
				} else {
					importButton.disabled = false;
					importButton.setText('Import');
					cancelButton.disabled = false;
				}
			} catch (error) {
				console.error('Import error:', error);
				new Notice(`Import failed: ${error.message}`);
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
}

function isSupportedCsv(fileName: string, expected?: 'diary' | 'watched' | 'watchlist'): boolean {
	const lower = fileName.toLowerCase();
	if (expected) {
		return lower.endsWith(`${expected}.csv`);
	}
	return lower.endsWith('diary.csv') || lower.endsWith('watched.csv') || lower.endsWith('watchlist.csv');
}
