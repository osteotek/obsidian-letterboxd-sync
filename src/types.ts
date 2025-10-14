export interface LetterboxdMovie {
	date: string;
	name: string;
	year: string;
	letterboxdUri: string;
	rating: string;
	rewatch: string;
	tags: string;
	watchedDate: string;
}

export interface MovieMetadata {
	directors: string[];
	genres: string[];
	description: string;
	cast: string[];
	averageRating?: string;
}

export interface LetterboxdSyncSettings {
	outputFolder: string;
	downloadPosters: boolean;
	posterFolder: string;
	templateFormat: string;
}
