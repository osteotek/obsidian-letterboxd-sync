import { LetterboxdMovie } from './types';

export function parseLetterboxdCSV(csvContent: string): LetterboxdMovie[] {
	const lines = csvContent.trim().split('\n');
	if (lines.length < 2) {
		throw new Error('CSV file is empty or invalid');
	}

	const headerFields = parseCSVLine(lines[0]);
	const headerIndex = new Map<string, number>();
	headerFields.forEach((field, index) => {
		headerIndex.set(field.trim(), index);
	});

	const dataLines = lines.slice(1);
	const movies: LetterboxdMovie[] = [];

	for (const line of dataLines) {
		if (!line.trim()) continue;

		const fields = parseCSVLine(line);
		const name = getField(fields, headerIndex, 'Name');
		const uri = getField(fields, headerIndex, 'Letterboxd URI');
		if (!name || !uri) {
			continue;
		}

		movies.push({
			date: getField(fields, headerIndex, 'Date'),
			name,
			year: getField(fields, headerIndex, 'Year'),
			letterboxdUri: uri,
			rating: getField(fields, headerIndex, 'Rating'),
			rewatch: getField(fields, headerIndex, 'Rewatch'),
			tags: getField(fields, headerIndex, 'Tags'),
			watchedDate: getField(fields, headerIndex, 'Watched Date') || getField(fields, headerIndex, 'Date')
		});
	}

	return movies;
}

function getField(fields: string[], indexMap: Map<string, number>, key: string): string {
	const index = indexMap.get(key);
	if (index === undefined) {
		return '';
	}
	return fields[index]?.trim() ?? '';
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
