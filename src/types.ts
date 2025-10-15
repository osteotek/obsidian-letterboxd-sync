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
	letterboxdRating?: string;
	studios?: string[];
	countries?: string[];
}

export interface MetadataFieldsConfig {
	directors: boolean;
	genres: boolean;
	description: boolean;
	cast: boolean;
	letterboxdRating: boolean;
	studios: boolean;
	countries: boolean;
}

export interface LetterboxdSyncSettings {
	outputFolder: string;
	downloadPosters: boolean;
	posterFolder: string;
	templateFormat: string;
	customTemplate: string;
	skipExisting: boolean;
	metadataFields: MetadataFieldsConfig;
	rateLimitDelay: number;
}
