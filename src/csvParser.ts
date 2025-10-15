import { LetterboxdMovie } from './types';

export interface CSVValidationResult {
	valid: boolean;
	error?: string;
	movieCount?: number;
}

export function validateLetterboxdCSV(csvContent: string): CSVValidationResult {
	try {
		const lines = csvContent.trim().split('\n');
		
		if (lines.length < 2) {
			return { valid: false, error: 'CSV file is empty or contains only a header' };
		}

		const headerFields = parseCSVLine(lines[0]);
		const headerIndex = new Map<string, number>();
		headerFields.forEach((field, index) => {
			headerIndex.set(field.trim(), index);
		});

		const requiredHeaders = ['Name', 'Year', 'Letterboxd URI'];
		for (const header of requiredHeaders) {
			if (!headerIndex.has(header)) {
				return { 
					valid: false, 
					error: `Missing required column: ${header}. Please use diary.csv, watched.csv, or watchlist.csv from Letterboxd.` 
				};
			}
		}

		const hasAnyDate = headerIndex.has('Watched Date') || headerIndex.has('Date');
		if (!hasAnyDate) {
			return { 
				valid: false, 
				error: 'CSV is missing date information. Please use diary.csv, watched.csv, or watchlist.csv from Letterboxd.' 
			};
		}

		const dataLines = lines.slice(1);
		let validMovieCount = 0;
		
		for (const line of dataLines) {
			if (!line.trim()) continue;
			
			const fields = parseCSVLine(line);
			const name = getField(fields, headerIndex, 'Name');
			const uri = getField(fields, headerIndex, 'Letterboxd URI');
			
			if (name && uri) {
				validMovieCount++;
			}
		}

		if (validMovieCount === 0) {
			return { valid: false, error: 'No valid movie entries found in CSV' };
		}

		return { valid: true, movieCount: validMovieCount };
	} catch (error) {
		return { valid: false, error: `CSV parsing error: ${error.message}` };
	}
}

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

	const requiredHeaders = ['Name', 'Year', 'Letterboxd URI'];
	for (const header of requiredHeaders) {
		if (!headerIndex.has(header)) {
			throw new Error('Unsupported CSV format. Use diary.csv, watched.csv, or watchlist.csv from Letterboxd.');
		}
	}

	const hasAnyDate = headerIndex.has('Watched Date') || headerIndex.has('Date');
	if (!hasAnyDate) {
		throw new Error('CSV is missing date information. Use diary.csv, watched.csv, or watchlist.csv from Letterboxd.');
	}

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
			watchedDate: getField(fields, headerIndex, 'Watched Date')
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
		const nextChar = line[i + 1];

		if (char === '"') {
			// Handle escaped quotes (double quotes)
			if (insideQuotes && nextChar === '"') {
				currentField += '"';
				i++; // Skip the next quote
			} else {
				insideQuotes = !insideQuotes;
			}
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
