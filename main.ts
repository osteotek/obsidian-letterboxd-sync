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

		contentEl.createEl('h2', { text: 'Import Letterboxd CSV' });

		const intro = contentEl.createEl('p', {
			text: 'Choose a Letterboxd CSV export. Notes and metadata will be created using your current plugin settings.'
		});
		intro.addClass('setting-item-description');

		const stepsList = contentEl.createEl('ol');
		stepsList.addClass('letterboxd-import-steps');
		stepsList.createEl('li', { text: 'Export your diary at Letterboxd → Settings → Data → Export.' });
		stepsList.createEl('li', { text: 'Unzip the download and locate the CSV you want to import (for example, watched.csv).' });
		stepsList.createEl('li', { text: 'Select the CSV below and click Import to generate notes.' });

		const summary = contentEl.createDiv({ cls: 'letterboxd-summary' });
		summary.createEl('h3', { text: 'Current settings' });
		const summaryList = summary.createEl('ul');
		summaryList.createEl('li', { text: `Notes folder: ${this.plugin.settings.outputFolder || 'Not set'}` });
		const posterSummary = this.plugin.settings.downloadPosters
			? `Posters will be saved to ${this.plugin.settings.posterFolder || 'the configured attachments folder'}.`
			: 'Posters will remain on Letterboxd; notes will link to the online image.';
		summaryList.createEl('li', { text: posterSummary });
		summaryList.createEl('li', { text: 'Status rules: watched.csv → Watched, watchlist.csv → Want to Watch, other CSVs use the watched date.' });

		const fileSetting = contentEl.createDiv({ cls: 'setting-item' });
		const fileInfo = fileSetting.createDiv({ cls: 'setting-item-info' });
		fileInfo.createEl('div', { text: 'CSV file' });
		fileInfo.createEl('div', { cls: 'setting-item-description', text: 'Select the Letterboxd CSV file you want to import.' });
		const fileControl = fileSetting.createDiv({ cls: 'setting-item-control' });
		const fileInput = fileControl.createEl('input', {
			attr: {
				type: 'file',
				accept: '.csv'
			}
		});

		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
		
		const importButton = buttonContainer.createEl('button', {
			text: 'Import',
			cls: 'mod-cta'
		});
		importButton.disabled = true;

		fileInput.addEventListener('change', () => {
			const hasFile = Boolean(fileInput.files?.length);
			importButton.disabled = !hasFile;
			if (hasFile) {
				importButton.setText('Import');
			}
		});

		importButton.addEventListener('click', async () => {
			const file = fileInput.files?.[0];
			if (!file) {
				new Notice('Please select a CSV file');
				return;
			}

			try {
				importButton.disabled = true;
				importButton.setText('Importing...');

				const csvContent = await file.text();
				
				await importLetterboxdCSV(
					this.app,
					csvContent,
					this.plugin.settings,
					{
						sourceName: file.name,
						onProgress: (current, total, movieName) => {
							importButton.setText(`Importing ${current}/${total}: ${movieName}...`);
						}
					}
				);

				this.close();
			} catch (error) {
				console.error('Import error:', error);
				new Notice(`Import failed: ${error.message}`);
				importButton.disabled = false;
				importButton.setText('Import');
			}
		});

		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});

		cancelButton.addEventListener('click', () => {
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
