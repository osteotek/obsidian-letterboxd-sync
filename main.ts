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
		
		contentEl.createEl('p', { 
			text: 'Select a CSV file exported from Letterboxd to import movies into your vault.' 
		});

		const fileInput = contentEl.createEl('input', {
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
					(current, total, movie) => {
						importButton.setText(`Importing ${current}/${total}: ${movie}...`);
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
