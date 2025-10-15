import { describe, expect, it } from 'vitest';
import { generateMovieNote } from '../src/noteGenerator';
import type { LetterboxdMovie, MovieMetadata, LetterboxdSyncSettings } from '../src/types';

const DEFAULT_SETTINGS: LetterboxdSyncSettings = {
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

describe('noteGenerator', () => {
	it('uses canonical Letterboxd URL in note frontmatter when resolved URL unavailable', () => {
		const movie: LetterboxdMovie = {
			date: '2024-01-01',
			name: 'Example Film',
			year: '2024',
			letterboxdUri: 'https://letterboxd.com/example-user/film/example-film/',
			rating: '4',
			rewatch: '',
			tags: '',
			watchedDate: '2024-01-02'
		};

		const metadata: MovieMetadata = {
			directors: [],
			genres: [],
			description: 'Example description',
			cast: [],
			letterboxdRating: '4.2',
			studios: ['Example Studio'],
			countries: ['Example Country']
		};

		const note = generateMovieNote(movie, undefined, metadata, undefined, undefined, 'Watched', DEFAULT_SETTINGS);

		expect(note).toContain('letterboxdUrl: https://letterboxd.com/film/example-film/');
	expect(note).toContain('description: "Example description"');
	expect(note).toContain('letterboxdRating: 4.2');
	expect(note).toContain('studios:');
	expect(note).toContain('countries:');
		expect(note).not.toContain('# Example Film (2024)');
		expect(note).toContain('## Notes');
	});

	it('renders poster image outside of frontmatter when poster path provided', () => {
		const movie: LetterboxdMovie = {
			date: '2024-01-01',
			name: 'Example Film',
			year: '2024',
			letterboxdUri: 'https://letterboxd.com/film/example-film/',
			rating: '',
			rewatch: '',
			tags: '',
			watchedDate: ''
		};

		const metadata: MovieMetadata = {
			directors: [],
			genres: [],
			description: '',
			cast: []
		};

		const note = generateMovieNote(movie, 'Letterboxd/attachments/example.jpg', metadata, undefined, undefined, 'Watched', DEFAULT_SETTINGS);

		const body = note.split('---\n').pop() ?? '';
		expect(body).toContain('![[Letterboxd/attachments/example.jpg]]');
	});

	it('falls back to poster link when image download disabled', () => {
		const movie: LetterboxdMovie = {
			date: '2024-01-01',
			name: 'Example Film',
			year: '2024',
			letterboxdUri: 'https://letterboxd.com/film/example-film/',
			rating: '',
			rewatch: '',
			tags: '',
			watchedDate: ''
		};

		const metadata: MovieMetadata = {
			directors: [],
			genres: [],
			description: '',
			cast: []
		};

		const note = generateMovieNote(movie, undefined, metadata, undefined, 'https://example.com/poster.jpg', 'Watched', DEFAULT_SETTINGS);
		const yaml = note.split('---')[1];
		const body = note.split('---\n').pop() ?? '';

		expect(yaml).toContain('cover: "https://example.com/poster.jpg"');
		expect(body).toContain('![Example Film Poster](https://example.com/poster.jpg)');
	});

	it('normalizes resolved URL to canonical film URL', () => {
		const movie: LetterboxdMovie = {
			date: '2024-01-01',
			name: 'Example Film',
			year: '2024',
			letterboxdUri: 'https://boxd.it/abcd',
			rating: '',
			rewatch: '',
			tags: '',
			watchedDate: ''
		};

		const metadata: MovieMetadata = {
			directors: [],
			genres: [],
			description: '',
			cast: []
		};

	const note = generateMovieNote(
		movie,
		undefined,
		metadata,
		'https://letterboxd.com/someuser/film/example-film/',
		undefined,
		'Watched',
		DEFAULT_SETTINGS
	);

	expect(note).toContain('letterboxdUrl: https://letterboxd.com/film/example-film/');
		expect(note).toContain('status: Watched');
		expect(note).toContain('letterboxdUrl: https://letterboxd.com/film/example-film/');
	});

	it('allows custom status when provided', () => {
		const movie: LetterboxdMovie = {
			date: '',
			name: 'Example Film',
			year: '2024',
			letterboxdUri: 'https://letterboxd.com/film/example-film/',
			rating: '',
			rewatch: '',
			tags: '',
			watchedDate: ''
		};

		const metadata: MovieMetadata = {
			directors: [],
			genres: [],
			description: '',
			cast: []
		};

		const note = generateMovieNote(movie, undefined, metadata, undefined, undefined, 'Want to Watch', DEFAULT_SETTINGS);
		expect(note).toContain('status: Want to Watch');
	});

	it('filters metadata fields based on settings', () => {
		const movie: LetterboxdMovie = {
			date: '2024-01-01',
			name: 'Example Film',
			year: '2024',
			letterboxdUri: 'https://letterboxd.com/film/example-film/',
			rating: '',
			rewatch: '',
			tags: '',
			watchedDate: ''
		};

		const metadata: MovieMetadata = {
			directors: ['Director One'],
			genres: ['Action'],
			description: 'A great film',
			cast: ['Actor One'],
			letterboxdRating: '4.2',
			studios: ['Studio One'],
			countries: ['USA']
		};

		const settings: LetterboxdSyncSettings = {
			...DEFAULT_SETTINGS,
			metadataFields: {
				directors: false,
				genres: true,
				description: false,
				cast: false,
				letterboxdRating: false,
				studios: false,
				countries: false
			}
		};

		const note = generateMovieNote(movie, undefined, metadata, undefined, undefined, 'Watched', settings);

		// Should include genres
		expect(note).toContain('genres:');
		expect(note).toContain('Action');
		
		// Should NOT include disabled fields
		expect(note).not.toContain('directors:');
		expect(note).not.toContain('Director One');
		expect(note).not.toContain('description:');
		expect(note).not.toContain('cast:');
		expect(note).not.toContain('letterboxdRating: 4.2');
		expect(note).not.toContain('studios:');
		expect(note).not.toContain('countries:');
	});

	it('generates note from custom template', () => {
		const movie: LetterboxdMovie = {
			date: '2024-01-01',
			name: 'Example Film',
			year: '2024',
			letterboxdUri: 'https://letterboxd.com/film/example-film/',
			rating: '4',
			rewatch: '',
			tags: '',
			watchedDate: '2024-01-15'
		};

		const metadata: MovieMetadata = {
			directors: ['Director One'],
			genres: ['Action', 'Drama'],
			description: 'A great film',
			cast: [],
			letterboxdRating: '4.2'
		};

		const customTemplate = `---
title: {{title}}
year: {{year}}
{{#if directors}}director: {{#each directors}}{{this}}{{/each}}{{/if}}
---

# {{title}} ({{year}})
Rating: {{rating}}
`;

		const settings: LetterboxdSyncSettings = {
			...DEFAULT_SETTINGS,
			templateFormat: 'custom',
			customTemplate: customTemplate
		};

		const note = generateMovieNote(movie, undefined, metadata, undefined, undefined, 'Watched', settings);

		expect(note).toContain('title: Example Film');
		expect(note).toContain('year: 2024');
		expect(note).toContain('director: Director One');
		expect(note).toContain('# Example Film (2024)');
		expect(note).toContain('Rating: 4');
	});
});
