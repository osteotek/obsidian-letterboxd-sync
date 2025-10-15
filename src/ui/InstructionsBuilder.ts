import { LetterboxdSyncSettings } from '../types';

/**
 * Builds the instruction cards UI
 */
export class InstructionsBuilder {
	static build(container: HTMLElement, settings: LetterboxdSyncSettings): void {
		// Introduction card
		const introCard = container.createDiv({ cls: 'letterboxd-info-card' });
		introCard.createEl('div', { 
			text: '📥 Getting Started', 
			cls: 'letterboxd-info-card-title' 
		});
		introCard.createEl('p', {
			text: 'Import your Letterboxd viewing history into Obsidian. Select one or more CSV files from your Letterboxd data export.',
			cls: 'letterboxd-info-card-text'
		});

		// Steps card
		const stepsCard = container.createDiv({ cls: 'letterboxd-info-card' });
		stepsCard.createEl('div', { 
			text: '📋 Export Instructions', 
			cls: 'letterboxd-info-card-title' 
		});
		const stepsContainer = stepsCard.createDiv({ cls: 'letterboxd-steps-container' });
		
		this.createStep(stepsContainer, '1', 'Go to Letterboxd → Settings → Data → Export');
		this.createStep(stepsContainer, '2', 'Unzip the download and locate diary.csv, watched.csv, and watchlist.csv');
		this.createStep(stepsContainer, '3', 'Select any combination below and click Import');

		// Settings card
		const settingsCard = container.createDiv({ cls: 'letterboxd-info-card' });
		settingsCard.createEl('div', { 
			text: '⚙️ Current Settings', 
			cls: 'letterboxd-info-card-title' 
		});
		
		const settingsGrid = settingsCard.createDiv({ cls: 'letterboxd-settings-grid' });
		
		this.createSettingItem(settingsGrid, 'Notes Folder', settings.outputFolder || 'Not set');
		
		const posterText = settings.downloadPosters
			? `Download to ${settings.posterFolder}`
			: 'Link to online images';
		this.createSettingItem(settingsGrid, 'Posters', posterText);
		
		this.createSettingItem(settingsGrid, 'Status Rules', 'Diary/Watched → Watched, Watchlist → Want to Watch');
	}

	private static createStep(container: HTMLElement, number: string, text: string): void {
		const step = container.createDiv({ cls: 'letterboxd-step' });
		step.createEl('span', { text: number, cls: 'letterboxd-step-number' });
		step.createEl('span', { text, cls: 'letterboxd-step-text' });
	}

	private static createSettingItem(container: HTMLElement, label: string, value: string): void {
		const item = container.createDiv({ cls: 'letterboxd-settings-item' });
		item.createEl('span', { text: label, cls: 'letterboxd-settings-label' });
		item.createEl('span', { text: value, cls: 'letterboxd-settings-value' });
	}
}
