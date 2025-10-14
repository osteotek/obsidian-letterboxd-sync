import { App, PluginSettingTab, Setting } from 'obsidian';
import LetterboxdSyncPlugin from '../main';
import { LetterboxdSyncSettings } from './types';

export const DEFAULT_SETTINGS: LetterboxdSyncSettings = {
	outputFolder: 'Letterboxd',
	downloadPosters: false,
	posterFolder: 'Letterboxd/attachments',
	templateFormat: 'default'
};

export class LetterboxdSettingTab extends PluginSettingTab {
	plugin: LetterboxdSyncPlugin;

	constructor(app: App, plugin: LetterboxdSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

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
	}
}
