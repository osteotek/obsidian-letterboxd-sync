import { describe, expect, it } from 'vitest';
import { parseLetterboxdCSV } from '../src/csvParser';

describe('csvParser', () => {
	it('parses diary export with full columns', () => {
		const csv = `Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n2024-01-01,Film A,2023,https://letterboxd.com/film/film-a/,4,,tag1,2024-01-02`;
		const result = parseLetterboxdCSV(csv);
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			date: '2024-01-01',
			name: 'Film A',
			year: '2023',
			letterboxdUri: 'https://letterboxd.com/film/film-a/',
			rating: '4',
			rewatch: '',
			tags: 'tag1',
			watchedDate: '2024-01-02'
		});
	});

	it('parses watched.csv with limited columns', () => {
		const csv = `Date,Name,Year,Letterboxd URI\n2024-01-01,Film B,2020,https://letterboxd.com/film/film-b/`;
		const result = parseLetterboxdCSV(csv);
		expect(result).toHaveLength(1);
		expect(result[0].watchedDate).toBe('');
		expect(result[0].rating).toBe('');
	});

	it('rejects unsupported headers', () => {
		const csv = `Foo,Bar\n1,2`;
		expect(() => parseLetterboxdCSV(csv)).toThrow('Unsupported CSV format');
	});
});
