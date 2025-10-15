# Letterboxd Sync for Obsidian

Import your Letterboxd viewing history into Obsidian with a modern, real-time progress interface. Automatically fetches movie metadata, posters, and creates beautifully formatted notes.

---

## Features

- **Modern UI** – Card-based interface with live progress tracking and movie poster preview
- **Smart import** – Multi-file support with automatic deduplication (diary + watched)
- **Rich metadata** – Directors, cast, genres, studios, countries, ratings from JSON-LD
- **Poster management** – Download locally or link remotely, skips existing files
- **Real-time stats** – Progress bar, time elapsed, ETA, current movie display
- **Safe & clean** – Auto folder creation, filename sanitization, graceful cancellation

---

## Quick Start

1. **Export** from Letterboxd (Settings → Data → Export)
2. **Install** plugin: Copy `main.js`, `manifest.json`, `styles.css` to `.obsidian/plugins/letterboxd-sync/`
3. **Import** via Command Palette → "Import Letterboxd CSV"
   - Select any combination of `diary.csv`, `watched.csv`, `watchlist.csv`
   - Watch real-time progress with movie posters and stats
   - Close modal or click Cancel to stop anytime

---

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| Output folder | `Letterboxd` | Where movie notes are saved |
| Download posters | Off | Save posters locally vs. remote links |
| Poster folder | `Letterboxd/attachments` | Local poster storage |

---

## Smart Deduplication

When importing both `diary.csv` and `watched.csv`, the plugin automatically excludes diary movies from watched to prevent duplicates. Diary entries (with dates, ratings) take precedence.

---

## Example Output

\`\`\`yaml
---
title: "The Matrix"
year: 1999
rating: 4.5
cover: "[[Letterboxd/attachments/The Matrix_1999.jpg]]"
description: "Set in the 22nd century..."
directors: [The Wachowskis]
genres: [Science Fiction, Action]
cast: [Keanu Reeves, Laurence Fishburne, Carrie-Anne Moss]
letterboxdRating: 4.3
watched: 2024-10-09
status: Watched
letterboxdUrl: https://letterboxd.com/film/the-matrix/
---

![[Letterboxd/attachments/The Matrix_1999.jpg]]

## Notes
\`\`\`

**Vault structure:**
\`\`\`
Letterboxd/
├── The Matrix (1999).md
├── Inception (2010).md
└── attachments/
    ├── The Matrix_1999.jpg
    └── Inception_2010.jpg
\`\`\`

---

## Development

\`\`\`bash
npm install    # dependencies
npm run dev    # watch mode
npm run build  # production build
npm test       # run tests
\`\`\`

**Architecture:** TypeScript, esbuild bundler, zero runtime dependencies
- `main.ts` – Modal UI with progress tracking
- `src/csvParser.ts` – CSV parsing with escape handling
- `src/dataFetcher/` – JSON-LD scraping, poster downloads
- `src/importer.ts` – Deduplication, progress callbacks, cancellation
- `src/noteGenerator.ts` – YAML frontmatter generation

---

## License

MIT © Contributors
