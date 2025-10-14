import { describe, beforeEach, afterEach, expect, it, vi, type Mock } from 'vitest';
import { fetchMoviePageData, downloadPoster } from '../src/posterFetcher';
import { __setRequestUrlImplementation, __resetRequestUrlImplementation } from 'obsidian';

type MockResponse = {
	status: number;
	headers?: Record<string, string>;
	text?: string;
	arrayBuffer?: ArrayBuffer;
};

let requestUrlMock: Mock<[unknown], Promise<unknown>>;
let responseQueue: MockResponse[] = [];

describe('posterFetcher (unit)', () => {
	beforeEach(() => {
		responseQueue = [];
		requestUrlMock = vi.fn(async () => {
			if (responseQueue.length === 0) {
				throw new Error('No mock responses remaining');
			}
			const response = responseQueue.shift()!;
			return {
				status: response.status,
				headers: response.headers ?? {},
				text: response.text ?? '',
				arrayBuffer: response.arrayBuffer ?? new ArrayBuffer(0)
			};
		});

		__setRequestUrlImplementation(async (params) => requestUrlMock(params));
	});

	afterEach(() => {
		__resetRequestUrlImplementation();
	});

	it('resolves metadata and canonical URL from Letterboxd short link', async () => {
		const html = `
			<html>
				<head>
					<script type="application/ld+json">
						{
							"@type": "Movie",
							"image": "https://images.example/film-poster.jpg",
							"director": [{"@type":"Person","name":"Director Name"}],
							"actors": [
								{"@type":"Person","name":"Actor One"},
								{"@type":"Person","name":"Actor Two"},
								{"@type":"Person","name":"Actor Three"},
								{"@type":"Person","name":"Actor Four"},
								{"@type":"Person","name":"Actor Five"},
								{"@type":"Person","name":"Actor Six"},
								{"@type":"Person","name":"Actor Seven"},
								{"@type":"Person","name":"Actor Eight"},
								{"@type":"Person","name":"Actor Nine"},
								{"@type":"Person","name":"Actor Ten"},
								{"@type":"Person","name":"Actor Eleven"},
								{"@type":"Person","name":"Actor Twelve"}
							],
							"genre": ["Drama", "Science Fiction"],
							"description": "Example description.",
							"url": "https://letterboxd.com/film/example-film/"
						}
					</script>
					<meta property="og:image" content="https://images.example/cover.jpg" />
					<meta property="og:description" content="Fallback description" />
				</head>
				<body>
					<a href="/director/director-name/">Director Name</a>
					<a href="/actor/actor-one/">Actor One</a>
					<a href="/films/genre/drama/">Drama</a>
				</body>
			</html>
		`;

		queueResponses([
			{
				status: 301,
				headers: { Location: 'https://letterboxd.com/member-name/film/example-film/' }
			},
			{
				status: 200,
				text: html
			},
			{
				status: 200,
				text: html
			}
		]);

		const result = await fetchMoviePageData('https://boxd.it/abcd');

		expect(requestUrlMock).toHaveBeenCalledTimes(3);
		expect(result.posterUrl).toBe('https://images.example/film-poster.jpg');
		expect(result.movieUrl).toBe('https://letterboxd.com/film/example-film/');
		expect(result.metadata.description).toBe('Example description.');
		expect(result.metadata.directors).toContain('Director Name');
		expect(result.metadata.genres).toContain('Science Fiction');
		expect(result.metadata.cast).toContain('Actor Two');
		expect(result.metadata.cast.length).toBe(10);
	});

	it('falls back to og description when JSON-LD description missing', async () => {
		const html = `
			<html>
				<head>
					<script type="application/ld+json">
						{
							"@type": "Movie",
							"image": "https://images.example/film-poster.jpg",
							"director": [{"@type":"Person","name":"Director Name"}],
							"actors": [{"@type":"Person","name":"Actor One"}],
							"genre": ["Drama"],
							"url": "https://letterboxd.com/film/example-film/"
						}
					</script>
					<meta property="og:description" content="OG description" />
				</head>
			</html>
		`;

		queueResponses([
			{
				status: 200,
				text: html
			}
		]);

		const result = await fetchMoviePageData('https://letterboxd.com/film/example-film/');
		expect(result.metadata.description).toBe('OG description');
	});

	it('downloads poster binary following redirects', async () => {
		const buffer = new Uint8Array([1, 2, 3]).buffer;

		queueResponses([
			{
				status: 302,
				headers: { Location: 'https://cdn.example/poster.jpg' }
			},
			{
				status: 200,
				arrayBuffer: buffer
			}
		]);

		const data = await downloadPoster('https://letterboxd.example/poster.jpg');

		expect(requestUrlMock).toHaveBeenCalledTimes(2);
		expect(data).toBeInstanceOf(ArrayBuffer);
		expect((data as ArrayBuffer).byteLength).toBe(3);
	});

	it('normalizes diary film URL before fetching', async () => {
		const html = `
			<html>
				<head>
					<script type="application/ld+json">
						{
							"@type": "Movie",
							"image": "https://images.example/film-poster.jpg",
							"director": [{"@type":"Person","name":"Director Name"}],
							"genre": ["Drama"],
							"url": "https://letterboxd.com/film/example-film/"
						}
					</script>
				</head>
			</html>
		`;

		queueResponses([
			{
				status: 200,
				text: html
			}
		]);

		const result = await fetchMoviePageData('https://letterboxd.com/someuser/film/example-film/');

		expect(requestUrlMock).toHaveBeenCalledTimes(1);
		const firstCallParam = requestUrlMock.mock.calls[0]?.[0] as { url?: string } | undefined;
		expect(firstCallParam?.url).toBe('https://letterboxd.com/film/example-film/');
		expect(result.movieUrl).toBe('https://letterboxd.com/film/example-film/');
		expect(result.posterUrl).toBe('https://images.example/film-poster.jpg');
	});
});

function queueResponses(responses: MockResponse[]): void {
	responseQueue = responses.slice();
}
