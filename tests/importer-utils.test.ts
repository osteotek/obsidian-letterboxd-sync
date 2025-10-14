import { describe, expect, it } from 'vitest';
import { determineStatus, extractNotesSection, mergeWithExistingNotes } from '../src/importer';
import type { LetterboxdMovie } from '../src/types';

describe('importer utilities', () => {
	const baseMovie: LetterboxdMovie = {
		date: '',
		name: 'Example',
		year: '2024',
		letterboxdUri: 'https://letterboxd.com/film/example/',
		rating: '',
		rewatch: '',
		tags: '',
		watchedDate: ''
	};

	it('determines status from watched.csv', () => {
		expect(determineStatus(baseMovie, 'watched.csv')).toBe('Watched');
	});

	it('determines status from watchlist.csv', () => {
		expect(determineStatus(baseMovie, 'watchlist.csv')).toBe('Want to Watch');
	});

	it('uses watched date when available', () => {
		expect(determineStatus({ ...baseMovie, watchedDate: '2024-01-01' })).toBe('Watched');
	});

	it('defaults to Want to Watch when no date present', () => {
		expect(determineStatus(baseMovie)).toBe('Want to Watch');
	});

	it('extracts notes section when present', () => {
		const content = '---\nmeta\n---\n\n## Notes\nExisting text';
		expect(extractNotesSection(content)).toBe('## Notes\nExisting text');
	});

	it('returns null when notes section missing', () => {
		expect(extractNotesSection('no notes here')).toBeNull();
	});

	it('merges metadata with existing notes', () => {
		const newContent = '---\nmeta\n---\n\n## Notes\n';
		const merged = mergeWithExistingNotes(newContent, '## Notes\nExisting');
		expect(merged).toBe('---\nmeta\n---\n\n## Notes\nExisting');
	});

	it('appends notes when new content lacks section', () => {
		const merged = mergeWithExistingNotes('---\nmeta\n---', '## Notes\nExisting');
		expect(merged.endsWith('## Notes\nExisting')).toBe(true);
	});
});
