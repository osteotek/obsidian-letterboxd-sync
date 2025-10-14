import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	resolve: {
		alias: {
			obsidian: resolve(__dirname, 'tests/mocks/obsidian.ts')
		}
	},
	test: {
		environment: 'node'
	}
});
