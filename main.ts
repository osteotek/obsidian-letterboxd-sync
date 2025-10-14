import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, normalizePath, requestUrl } from 'obsidian';

interface LetterboxdSyncSettings {
	outputFolder: string;
	downloadImages: boolean;
	imageFolder: string;
}

const DEFAULT_SETTINGS: LetterboxdSyncSettings = {
	outputFolder: 'Letterboxd',
	downloadImages: true,
	imageFolder: 'Letterboxd/images'
};

interface LetterboxdEntry {
	date: string;
	name: string;
	year: string;
	letterboxdUri: string;
	rating: string;
	rewatch: string;
	tags: string;
	watchedDate: string;
}

export default class LetterboxdSyncPlugin extends Plugin {
	settings: LetterboxdSyncSettings;

	async onload() {
		await this.loadSettings();

		// Add command to import CSV
		this.addCommand({
			id: 'import-letterboxd-csv',
			name: 'Import Letterboxd CSV',
			callback: () => {
				this.importCSV();
			}
		});

		// Add settings tab
		this.addSettingTab(new LetterboxdSyncSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async importCSV() {
		// Create file input element
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.csv';
		
		input.onchange = async (e: Event) => {
			const target = e.target as HTMLInputElement;
			const file = target.files?.[0];
			
			if (!file) {
				new Notice('No file selected');
				return;
			}

			try {
				const text = await file.text();
				await this.processCSV(text);
			} catch (error) {
				console.error('Error reading CSV:', error);
				new Notice('Error reading CSV file');
			}
		};

		input.click();
	}

	async processCSV(csvText: string) {
		const lines = csvText.split('\n').filter(line => line.trim());
		
		if (lines.length < 2) {
			new Notice('CSV file is empty or invalid');
			return;
		}

		// Skip header row
		const entries: LetterboxdEntry[] = [];
		for (let i = 1; i < lines.length; i++) {
			const entry = this.parseCSVLine(lines[i]);
			if (entry) {
				entries.push(entry);
			}
		}

		if (entries.length === 0) {
			new Notice('No valid entries found in CSV');
			return;
		}

		new Notice(`Processing ${entries.length} entries...`);

		// Create output folder if it doesn't exist
		await this.ensureFolderExists(this.settings.outputFolder);
		
		if (this.settings.downloadImages) {
			await this.ensureFolderExists(this.settings.imageFolder);
		}

		// Process each entry
		let successCount = 0;
		let errorCount = 0;

		for (const entry of entries) {
			try {
				await this.createMovieNote(entry);
				successCount++;
			} catch (error) {
				console.error(`Error creating note for ${entry.name}:`, error);
				errorCount++;
			}
		}

		new Notice(`Import complete: ${successCount} successful, ${errorCount} errors`);
	}

	parseCSVLine(line: string): LetterboxdEntry | null {
		// Simple CSV parser that handles quoted fields
		const fields: string[] = [];
		let currentField = '';
		let inQuotes = false;

		for (let i = 0; i < line.length; i++) {
			const char = line[i];

			if (char === '"') {
				inQuotes = !inQuotes;
			} else if (char === ',' && !inQuotes) {
				fields.push(currentField);
				currentField = '';
			} else {
				currentField += char;
			}
		}
		fields.push(currentField);

		if (fields.length < 8) {
			return null;
		}

		return {
			date: fields[0].trim(),
			name: fields[1].trim(),
			year: fields[2].trim(),
			letterboxdUri: fields[3].trim(),
			rating: fields[4].trim(),
			rewatch: fields[5].trim(),
			tags: fields[6].trim(),
			watchedDate: fields[7].trim()
		};
	}

	async ensureFolderExists(folderPath: string) {
		const normalizedPath = normalizePath(folderPath);
		const folder = this.app.vault.getAbstractFileByPath(normalizedPath);
		
		if (!folder) {
			await this.app.vault.createFolder(normalizedPath);
		}
	}

	async createMovieNote(entry: LetterboxdEntry) {
		// Create a safe filename
		const fileName = this.sanitizeFileName(`${entry.name} (${entry.year})`);
		const filePath = normalizePath(`${this.settings.outputFolder}/${fileName}.md`);

		// Check if file already exists
		const existingFile = this.app.vault.getAbstractFileByPath(filePath);
		if (existingFile instanceof TFile) {
			console.log(`File already exists: ${filePath}`);
			return;
		}

		// Download poster image if enabled
		let posterPath = '';
		if (this.settings.downloadImages && entry.letterboxdUri) {
			try {
				posterPath = await this.downloadPosterImage(entry);
			} catch (error) {
				console.error(`Error downloading poster for ${entry.name}:`, error);
			}
		}

		// Create markdown content
		const content = this.generateMarkdownContent(entry, posterPath);

		// Create the file
		await this.app.vault.create(filePath, content);
	}

	sanitizeFileName(name: string): string {
		// Remove or replace invalid characters
		return name.replace(/[\\/:*?"<>|]/g, '-');
	}

	async downloadPosterImage(entry: LetterboxdEntry): Promise<string> {
		try {
			// Fetch the Letterboxd page
			const response = await requestUrl({
				url: entry.letterboxdUri,
				method: 'GET'
			});

			// Extract poster image URL from HTML
			const html = response.text;
			const posterMatch = html.match(/<img[^>]+class="[^"]*image[^"]*"[^>]+src="([^"]+)"/i);
			
			if (!posterMatch || !posterMatch[1]) {
				console.log(`No poster image found for ${entry.name}`);
				return '';
			}

			let imageUrl = posterMatch[1];
			
			// Ensure full URL
			if (imageUrl.startsWith('//')) {
				imageUrl = 'https:' + imageUrl;
			} else if (!imageUrl.startsWith('http')) {
				imageUrl = 'https://letterboxd.com' + imageUrl;
			}

			// Download the image
			const imageResponse = await requestUrl({
				url: imageUrl,
				method: 'GET'
			});

			// Create image filename
			const imageName = this.sanitizeFileName(`${entry.name}-${entry.year}.jpg`);
			const imagePath = normalizePath(`${this.settings.imageFolder}/${imageName}`);

			// Save the image
			await this.app.vault.createBinary(imagePath, imageResponse.arrayBuffer);

			return imagePath;
		} catch (error) {
			console.error('Error downloading poster:', error);
			return '';
		}
	}

	generateMarkdownContent(entry: LetterboxdEntry, posterPath: string): string {
		const lines: string[] = [];

		// Add frontmatter
		lines.push('---');
		lines.push(`title: "${entry.name}"`);
		lines.push(`year: ${entry.year}`);
		if (entry.rating) {
			lines.push(`rating: ${entry.rating}`);
		}
		if (entry.watchedDate) {
			lines.push(`watched: ${entry.watchedDate}`);
		}
		if (entry.rewatch && entry.rewatch.toLowerCase() === 'yes') {
			lines.push(`rewatch: true`);
		}
		if (entry.tags) {
			const tags = entry.tags.split(',').map(t => t.trim()).filter(t => t);
			if (tags.length > 0) {
				lines.push(`tags: [${tags.map(t => `"${t}"`).join(', ')}]`);
			}
		}
		lines.push(`letterboxd: ${entry.letterboxdUri}`);
		lines.push('---');
		lines.push('');

		// Add title
		lines.push(`# ${entry.name} (${entry.year})`);
		lines.push('');

		// Add poster image if available
		if (posterPath) {
			lines.push(`![[${posterPath}]]`);
			lines.push('');
		}

		// Add details
		lines.push('## Details');
		lines.push('');
		if (entry.rating) {
			lines.push(`**Rating:** ${entry.rating}/5`);
		}
		if (entry.watchedDate) {
			lines.push(`**Watched:** ${entry.watchedDate}`);
		}
		if (entry.rewatch && entry.rewatch.toLowerCase() === 'yes') {
			lines.push(`**Rewatch:** Yes`);
		}
		if (entry.tags) {
			lines.push(`**Tags:** ${entry.tags}`);
		}
		lines.push(`**Letterboxd:** ${entry.letterboxdUri}`);
		lines.push('');

		// Add notes section
		lines.push('## Notes');
		lines.push('');

		return lines.join('\n');
	}
}

class LetterboxdSyncSettingTab extends PluginSettingTab {
	plugin: LetterboxdSyncPlugin;

	constructor(app: App, plugin: LetterboxdSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Letterboxd Sync Settings' });

		new Setting(containerEl)
			.setName('Output folder')
			.setDesc('Folder where movie notes will be created')
			.addText(text => text
				.setPlaceholder('Letterboxd')
				.setValue(this.plugin.settings.outputFolder)
				.onChange(async (value) => {
					this.plugin.settings.outputFolder = value || 'Letterboxd';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Download images')
			.setDesc('Automatically download poster images from Letterboxd')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.downloadImages)
				.onChange(async (value) => {
					this.plugin.settings.downloadImages = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Image folder')
			.setDesc('Folder where poster images will be saved')
			.addText(text => text
				.setPlaceholder('Letterboxd/images')
				.setValue(this.plugin.settings.imageFolder)
				.onChange(async (value) => {
					this.plugin.settings.imageFolder = value || 'Letterboxd/images';
					await this.plugin.saveSettings();
				}));
	}
}
