/**
 * Manages the stats display UI during import
 */
export class StatsDisplay {
	container: HTMLElement;
	posterElement: HTMLImageElement;
	progressBarElement: HTMLElement;
	elements: {
		currentFile?: HTMLElement;
		progress?: HTMLElement;
		currentMovie?: HTMLElement;
		filesProcessed?: HTMLElement;
		timeElapsed?: HTMLElement;
		timeRemaining?: HTMLElement;
	};
	startTime: number;
	timerHandle: number | null;
	isActive: boolean;
	totalMovies: number;
	processedMovies: number;

	constructor(container: HTMLElement) {
		this.container = container;
		this.elements = {};
		this.startTime = 0;
		this.timerHandle = null;
		this.isActive = true;
		this.totalMovies = 0;
		this.processedMovies = 0;
		this.buildUI();
	}

	private buildUI(): void {
		this.container.createEl('h3', { text: 'Import Progress', cls: 'letterboxd-stats-title' });

		const statsGrid = this.container.createDiv({ cls: 'letterboxd-stats-grid' });

		// Poster display (wide card at top)
		const posterCard = statsGrid.createDiv({ cls: 'letterboxd-stat-card letterboxd-stat-card-wide letterboxd-poster-card' });
		posterCard.createEl('div', { text: 'Current Movie', cls: 'letterboxd-stat-label' });
		const posterContainer = posterCard.createDiv({ cls: 'letterboxd-poster-container' });
		this.posterElement = posterContainer.createEl('img', { 
			cls: 'letterboxd-poster-image',
			attr: { alt: 'Movie Poster' }
		});
		this.posterElement.style.display = 'none';

		// Current file being processed
		const currentFileCard = statsGrid.createDiv({ cls: 'letterboxd-stat-card' });
		currentFileCard.createEl('div', { text: 'Current File', cls: 'letterboxd-stat-label' });
		this.elements.currentFile = currentFileCard.createEl('div', { 
			text: 'Initializing...', 
			cls: 'letterboxd-stat-value letterboxd-stat-file' 
		});

		// Current file number
		const filesCard = statsGrid.createDiv({ cls: 'letterboxd-stat-card' });
		filesCard.createEl('div', { text: 'File', cls: 'letterboxd-stat-label' });
		this.elements.filesProcessed = filesCard.createEl('div', { 
			text: '0/0', 
			cls: 'letterboxd-stat-value' 
		});

		// Progress bar card
		const progressCard = statsGrid.createDiv({ cls: 'letterboxd-stat-card letterboxd-stat-card-wide' });
		progressCard.createEl('div', { text: 'Progress', cls: 'letterboxd-stat-label' });
		this.elements.progress = progressCard.createEl('div', { 
			text: '0/0', 
			cls: 'letterboxd-stat-value letterboxd-stat-progress' 
		});
		const progressBarContainer = progressCard.createDiv({ cls: 'letterboxd-progress-bar-container' });
		this.progressBarElement = progressBarContainer.createDiv({ cls: 'letterboxd-progress-bar' });
		this.progressBarElement.style.width = '0%';
		this.elements.currentMovie = progressCard.createEl('div', { 
			text: 'Waiting...', 
			cls: 'letterboxd-stat-movie' 
		});

		// Time elapsed
		const timeCard = statsGrid.createDiv({ cls: 'letterboxd-stat-card' });
		timeCard.createEl('div', { text: 'Time Elapsed', cls: 'letterboxd-stat-label' });
		this.elements.timeElapsed = timeCard.createEl('div', { 
			text: '0s', 
			cls: 'letterboxd-stat-value' 
		});

		// Time remaining
		const timeRemainingCard = statsGrid.createDiv({ cls: 'letterboxd-stat-card' });
		timeRemainingCard.createEl('div', { text: 'Time Remaining', cls: 'letterboxd-stat-label' });
		this.elements.timeRemaining = timeRemainingCard.createEl('div', { 
			text: 'Calculating...', 
			cls: 'letterboxd-stat-value' 
		});
	}

	updateProgress(current: number, total: number, movieName: string, posterUrl?: string): void {
		this.processedMovies = current;
		this.totalMovies = total;

		if (this.elements.progress) {
			this.elements.progress.setText(`${current}/${total}`);
		}

		if (this.elements.currentMovie) {
			this.elements.currentMovie.setText(movieName);
		}

		// Update poster
		if (posterUrl) {
			this.posterElement.src = posterUrl;
			this.posterElement.style.display = 'block';
		} else {
			this.posterElement.style.display = 'none';
		}

		// Update progress bar
		if (this.progressBarElement && total > 0) {
			const percentage = (current / total) * 100;
			this.progressBarElement.style.width = `${percentage}%`;
		}

		this.updateTimeRemaining();
	}

	startTimer(): void {
		this.startTime = Date.now();
		this.updateTimeElapsed();
	}

	private updateTimeElapsed(): void {
		if (!this.isActive || !this.elements.timeElapsed || this.startTime === 0) {
			return;
		}
		
		const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
		const minutes = Math.floor(elapsed / 60);
		const seconds = elapsed % 60;
		const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
		this.elements.timeElapsed.setText(timeStr);
		
		this.updateTimeRemaining();
		
		if (this.isActive) {
			this.timerHandle = window.setTimeout(() => this.updateTimeElapsed(), 1000);
		}
	}

	private updateTimeRemaining(): void {
		if (!this.elements.timeRemaining || this.startTime === 0) {
			return;
		}

		if (this.processedMovies < 2 || this.totalMovies === 0) {
			this.elements.timeRemaining.setText('Calculating...');
			return;
		}

		const elapsed = (Date.now() - this.startTime) / 1000;
		const avgTimePerMovie = elapsed / this.processedMovies;
		const remainingMovies = this.totalMovies - this.processedMovies;
		const estimatedSecondsRemaining = Math.ceil(avgTimePerMovie * remainingMovies);

		if (estimatedSecondsRemaining < 1) {
			this.elements.timeRemaining.setText('Almost done!');
			return;
		}

		const minutes = Math.floor(estimatedSecondsRemaining / 60);
		const seconds = estimatedSecondsRemaining % 60;
		
		const timeStr = minutes > 0 ? `~${minutes}m ${seconds}s` : `~${seconds}s`;
		this.elements.timeRemaining.setText(timeStr);
	}

	setCurrentFile(fileName: string): void {
		if (this.elements.currentFile) {
			this.elements.currentFile.setText(fileName);
		}
	}

	setFileCount(current: number, total: number): void {
		if (this.elements.filesProcessed) {
			this.elements.filesProcessed.setText(`${current}/${total}`);
		}
	}

	cleanup(): void {
		this.isActive = false;
		if (this.timerHandle !== null) {
			window.clearTimeout(this.timerHandle);
			this.timerHandle = null;
		}
	}
}
