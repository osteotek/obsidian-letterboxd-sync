import { MovieMetadata } from '../types';

export interface MoviePageData {
	posterUrl: string | null;
	metadata: MovieMetadata;
	movieUrl: string | null;
}

export function createEmptyPageData(): MoviePageData {
	return {
		posterUrl: null,
		metadata: { directors: [], genres: [], description: '', cast: [], studios: [], countries: [] },
		movieUrl: null
	};
}
