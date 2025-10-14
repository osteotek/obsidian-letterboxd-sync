import { LetterboxdMovie } from './types';

export function parseLetterboxdCSV(csvContent: string): LetterboxdMovie[] {
	const lines = csvContent.trim().split('\n');
	if (lines.length < 2) {
		throw new Error('CSV file is empty or invalid');
	}

	// Skip header line
	const dataLines = lines.slice(1);
	const movies: LetterboxdMovie[] = [];

	for (const line of dataLines) {
		if (!line.trim()) continue;

		// Parse CSV line, handling quoted fields
		const fields = parseCSVLine(line);
		
		if (fields.length >= 8) {
			movies.push({
				date: fields[0],
				name: fields[1],
				year: fields[2],
				letterboxdUri: fields[3],
				rating: fields[4],
				rewatch: fields[5],
				tags: fields[6],
				watchedDate: fields[7]
			});
		}
	}

	return movies;
}

function parseCSVLine(line: string): string[] {
	const fields: string[] = [];
	let currentField = '';
	let insideQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (char === '"') {
			insideQuotes = !insideQuotes;
		} else if (char === ',' && !insideQuotes) {
			fields.push(currentField);
			currentField = '';
		} else {
			currentField += char;
		}
	}

	// Add the last field
	fields.push(currentField);

	return fields;
}
