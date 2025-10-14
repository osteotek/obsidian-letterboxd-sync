import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { fetchMoviePageData, setDebugLogging } from '../src/dataFetcher';
import { __setRequestUrlImplementation, __resetRequestUrlImplementation, type RequestUrlParams, type RequestUrlResponse } from 'obsidian';

describe('dataFetcher (integration)', () => {
	beforeAll(() => {
		setDebugLogging(true);
		__setRequestUrlImplementation(realRequestUrl);
	});

	afterAll(() => {
		setDebugLogging(false);
		__resetRequestUrlImplementation();
	});

	it(
		'fetches metadata from a real Letterboxd film page',
		async () => {
			const result = await fetchMoviePageData('https://letterboxd.com/film/the-matrix/');

			expect(result.posterUrl).toBeTruthy();
			expect(result.posterUrl ?? '').toMatch(/letterboxd\.com|ltrbxd\.com/);
			expect(result.metadata.directors.length).toBeGreaterThan(0);
			expect(result.metadata.genres.length).toBeGreaterThan(0);
			expect(result.movieUrl).toBe('https://letterboxd.com/film/the-matrix/');
		},
		{
			timeout: 30000
		}
	);
});

async function realRequestUrl(params: RequestUrlParams): Promise<RequestUrlResponse> {
	const { url, method, headers, body, throw: shouldThrow } = normalizeParams(params);

	const response = await fetch(url, {
		method,
		headers,
		body,
		redirect: 'manual'
	});

	const headersRecord: Record<string, string> = {};
	response.headers.forEach((value, key) => {
		headersRecord[key.toLowerCase()] = value;
	});

	const clone = response.clone();
	const text = await response.text();
	const arrayBuffer = await clone.arrayBuffer();

	if (response.status >= 400 && (shouldThrow ?? true)) {
		throw new Error(`Request to ${url} failed with status ${response.status}`);
	}

	return {
		status: response.status,
		headers: headersRecord,
		text,
		arrayBuffer
	};
}

function normalizeParams(params: RequestUrlParams): {
	url: string;
	method: string;
	headers: Record<string, string>;
	body?: BodyInit | null;
	throw?: boolean;
} {
	if (typeof params === 'string') {
		return {
			url: params,
			method: 'GET',
			headers: {}
		};
	}

	return {
		url: params.url,
		method: params.method ?? 'GET',
		headers: params.headers ?? {},
		body: params.body as BodyInit | null,
		throw: params.throw
	};
}
