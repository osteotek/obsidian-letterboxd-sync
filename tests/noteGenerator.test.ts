import { describe, expect, it } from 'vitest';
import { generateMovieNote } from '../src/noteGenerator';
import type { LetterboxdMovie, MovieMetadata } from '../src/types';

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
			averageRating: '4.2',
			studios: ['Example Studio'],
			countries: ['Example Country']
		};

		const note = generateMovieNote(movie, undefined, metadata);

		expect(note).toContain('letterboxd: https://letterboxd.com/film/example-film/');
	expect(note).toContain('description: "Example description"');
	expect(note).toContain('averageRating: 4.2');
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

		const note = generateMovieNote(movie, 'Letterboxd/attachments/example.jpg', metadata);

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

		const note = generateMovieNote(movie, undefined, metadata, undefined, 'https://example.com/poster.jpg');
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
		'https://letterboxd.com/someuser/film/example-film/'
	);

	expect(note).toContain('letterboxd: https://letterboxd.com/film/example-film/');
	expect(note).toContain('status: Watched');
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

		const note = generateMovieNote(movie, undefined, metadata, undefined, undefined, 'Want to Watch');
		expect(note).toContain('status: Want to Watch');
	});
});
