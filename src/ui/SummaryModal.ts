import { App, Modal } from 'obsidian';

export interface ImportSummary {
	success: number;
	error: number;
	timeElapsed: string;
	cancelled?: boolean;
}

/**
 * Modal that displays import summary at completion
 */
export class SummaryModal extends Modal {
	private summary: ImportSummary;

	constructor(app: App, summary: ImportSummary) {
		super(app);
		this.summary = summary;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('letterboxd-summary-modal');

		const title = this.summary.cancelled ? 'Import Cancelled' : 'Import Complete';
		contentEl.createEl('h2', { text: title, cls: 'letterboxd-summary-title' });

		const statsContainer = contentEl.createDiv({ cls: 'letterboxd-summary-stats' });

		// Success count
		const successRow = statsContainer.createDiv({ cls: 'letterboxd-summary-row' });
		successRow.createEl('span', { text: 'Movies imported:', cls: 'letterboxd-summary-label' });
		successRow.createEl('span', { 
			text: this.summary.success.toString(), 
			cls: 'letterboxd-summary-value letterboxd-summary-success' 
		});

		// Error count
		if (this.summary.error > 0) {
			const errorRow = statsContainer.createDiv({ cls: 'letterboxd-summary-row' });
			errorRow.createEl('span', { text: 'Failed:', cls: 'letterboxd-summary-label' });
			errorRow.createEl('span', { 
				text: this.summary.error.toString(), 
				cls: 'letterboxd-summary-value letterboxd-summary-error' 
			});
		}

		// Time elapsed
		const timeRow = statsContainer.createDiv({ cls: 'letterboxd-summary-row' });
		timeRow.createEl('span', { text: 'Time elapsed:', cls: 'letterboxd-summary-label' });
		timeRow.createEl('span', { 
			text: this.summary.timeElapsed, 
			cls: 'letterboxd-summary-value' 
		});

		// Close button
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
		const closeButton = buttonContainer.createEl('button', {
			text: 'Close',
			cls: 'mod-cta'
		});
		closeButton.addEventListener('click', () => this.close());

		// Auto-focus close button for Enter key
		closeButton.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
