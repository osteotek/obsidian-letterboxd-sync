import { App, PluginSettingTab, Setting, TextAreaComponent } from 'obsidian';
import LetterboxdSyncPlugin from '../main';
import { LetterboxdSyncSettings } from './types';

export const DEFAULT_SETTINGS: LetterboxdSyncSettings = {
	outputFolder: 'Letterboxd',
	downloadPosters: false,
	posterFolder: 'Letterboxd/attachments',
	templateFormat: 'default',
	customTemplate: '',
	skipExisting: false,
	metadataFields: {
		directors: true,
		genres: true,
		description: true,
		cast: true,
		letterboxdRating: true,
		studios: true,
		countries: true
	},
	rateLimitDelay: 200
};

export const DEFAULT_TEMPLATE = `---
title: "{{title}}"
year: {{year}}
{{#if rating}}rating: {{rating}}{{/if}}
{{#if cover}}cover: {{cover}}{{/if}}
{{#if description}}description: "{{description}}"{{/if}}
{{#if directors}}directors:
{{#each directors}}  - {{this}}
{{/each}}{{/if}}
{{#if genres}}genres:
{{#each genres}}  - {{this}}
{{/each}}{{/if}}
{{#if studios}}studios:
{{#each studios}}  - {{this}}
{{/each}}{{/if}}
{{#if countries}}countries:
{{#each countries}}  - {{this}}
{{/each}}{{/if}}
{{#if cast}}cast:
{{#each cast}}  - {{this}}
{{/each}}{{/if}}
{{#if watched}}watched: {{watched}}{{/if}}
{{#if rewatch}}rewatch: true{{/if}}
letterboxdUrl: {{letterboxdUrl}}
{{#if letterboxdRating}}letterboxdRating: {{letterboxdRating}}{{/if}}
status: {{status}}
---

{{#if coverImage}}{{coverImage}}

{{/if}}
## Notes

`;

export class LetterboxdSettingTab extends PluginSettingTab {
	plugin: LetterboxdSyncPlugin;

	constructor(app: App, plugin: LetterboxdSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// Section: Basic Settings
		containerEl.createEl('h2', { text: 'Basic Settings' });

		new Setting(containerEl)
			.setName('Output folder')
			.setDesc('Relative path inside your vault. Folders are created automatically if they do not exist.')
			.addText(text => text
				.setPlaceholder('Letterboxd')
				.setValue(this.plugin.settings.outputFolder)
				.onChange(async (value) => {
					this.plugin.settings.outputFolder = value;
					await this.plugin.saveSettings();
				}));

		// Section: Poster Settings
		containerEl.createEl('h2', { text: 'Poster Settings' });

		new Setting(containerEl)
			.setName('Download posters')
			.setDesc('Store poster images locally. When disabled, notes link to the Letterboxd poster instead of downloading it.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.downloadPosters)
				.onChange(async (value) => {
					this.plugin.settings.downloadPosters = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Poster folder')
			.setDesc('Destination for downloaded posters. Only used when poster downloads are enabled.')
			.addText(text => text
				.setPlaceholder('Letterboxd/attachments')
				.setValue(this.plugin.settings.posterFolder)
				.onChange(async (value) => {
					this.plugin.settings.posterFolder = value;
					await this.plugin.saveSettings();
				}));

		// Section: Metadata Fields
		containerEl.createEl('h2', { text: 'Metadata Fields' });
		containerEl.createEl('p', { 
			text: 'Choose which metadata fields to fetch from Letterboxd. Disabling fields can speed up imports.',
			cls: 'setting-item-description'
		});

		new Setting(containerEl)
			.setName('Directors')
			.setDesc('Include director information in movie notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.metadataFields.directors)
				.onChange(async (value) => {
					this.plugin.settings.metadataFields.directors = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Genres')
			.setDesc('Include genre information in movie notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.metadataFields.genres)
				.onChange(async (value) => {
					this.plugin.settings.metadataFields.genres = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Description')
			.setDesc('Include movie description/synopsis in notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.metadataFields.description)
				.onChange(async (value) => {
					this.plugin.settings.metadataFields.description = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Cast')
			.setDesc('Include cast information in movie notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.metadataFields.cast)
				.onChange(async (value) => {
					this.plugin.settings.metadataFields.cast = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Letterboxd Rating')
			.setDesc('Include average Letterboxd community rating')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.metadataFields.letterboxdRating)
				.onChange(async (value) => {
					this.plugin.settings.metadataFields.letterboxdRating = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Studios')
			.setDesc('Include production company information')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.metadataFields.studios)
				.onChange(async (value) => {
					this.plugin.settings.metadataFields.studios = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Countries')
			.setDesc('Include country of origin information')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.metadataFields.countries)
				.onChange(async (value) => {
					this.plugin.settings.metadataFields.countries = value;
					await this.plugin.saveSettings();
				}));

		// Section: Template Customization
		containerEl.createEl('h2', { text: 'Template Customization' });
		
		const templateDesc = containerEl.createDiv({ cls: 'setting-item-description' });
		templateDesc.createEl('p', { 
			text: 'Customize the format of generated movie notes. Use Handlebars-style syntax.'
		});
		templateDesc.createEl('p', { 
			text: 'Available variables: {{title}}, {{year}}, {{rating}}, {{cover}}, {{description}}, {{directors}}, {{genres}}, {{studios}}, {{countries}}, {{cast}}, {{watched}}, {{rewatch}}, {{letterboxdUrl}}, {{letterboxdRating}}, {{status}}, {{coverImage}}'
		});

		new Setting(containerEl)
			.setName('Template format')
			.setDesc('Choose between default template or custom template')
			.addDropdown(dropdown => dropdown
				.addOption('default', 'Default template')
				.addOption('custom', 'Custom template')
				.setValue(this.plugin.settings.templateFormat)
				.onChange(async (value) => {
					this.plugin.settings.templateFormat = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show/hide custom template
				}));

		if (this.plugin.settings.templateFormat === 'custom') {
			new Setting(containerEl)
				.setName('Custom template')
				.setDesc('Define your custom note template')
				.addTextArea((text: TextAreaComponent) => {
					text
						.setPlaceholder(DEFAULT_TEMPLATE)
						.setValue(this.plugin.settings.customTemplate || DEFAULT_TEMPLATE)
						.onChange(async (value) => {
							this.plugin.settings.customTemplate = value;
							await this.plugin.saveSettings();
						});
					text.inputEl.rows = 20;
					text.inputEl.cols = 60;
					text.inputEl.style.fontFamily = 'monospace';
					text.inputEl.style.fontSize = '0.9em';
					return text;
				});

			new Setting(containerEl)
				.setName('Reset to default')
				.setDesc('Reset custom template to the default template')
				.addButton(button => button
					.setButtonText('Reset')
					.onClick(async () => {
						this.plugin.settings.customTemplate = DEFAULT_TEMPLATE;
						await this.plugin.saveSettings();
						this.display();
					}));
		}

		// Section: Performance
		containerEl.createEl('h2', { text: 'Performance & Rate Limiting' });

		new Setting(containerEl)
			.setName('Rate limit delay')
			.setDesc('Delay between movie imports in milliseconds. Increase if you encounter rate limiting. (Recommended: 200-500ms)')
			.addText(text => text
				.setPlaceholder('200')
				.setValue(String(this.plugin.settings.rateLimitDelay))
				.onChange(async (value) => {
					const delay = parseInt(value);
					if (!isNaN(delay) && delay >= 0 && delay <= 5000) {
						this.plugin.settings.rateLimitDelay = delay;
						await this.plugin.saveSettings();
					}
				}));
	}
}
