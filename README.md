# Letterboxd Sync for Obsidian

Import your Letterboxd viewing history into Obsidian with a modern, real-time progress interface. Automatically fetches movie metadata, posters, and creates beautifully formatted notes.

## Features

- **Modern UI** – Single-card file selection, live progress with inline success/error counts, poster previews
- **Smart import** – Multi-file support, automatic deduplication, CSV validation, skip existing movies option
- **Rich metadata** – Directors, cast, genres, studios, countries, ratings (selectable fields)
- **Custom templates** – Define your own note format with Handlebars syntax
- **Poster management** – Download locally or link remotely, skips existing files
- **Keyboard shortcuts** – Enter to import, Esc to cancel
- **Rate limiting** – Configurable delay (default 200ms) to prevent rate limiting

---

## Quick Start

1. **Export** from Letterboxd (Settings → Data → Export)
2. **Install**: Copy `main.js`, `manifest.json`, `styles.css` to `.obsidian/plugins/letterboxd-sync/`
3. **Import** via Command Palette → "Import Letterboxd CSV"
   - Select CSV files (diary.csv, watched.csv, watchlist.csv)
   - Toggle "Skip existing movies" if needed
   - Press Enter or click Import
   - Watch progress with live stats and poster preview

---

## Settings

### Output & Posters
- **Output folder**: Where movie notes are saved (default: `Letterboxd`)
- **Download posters**: Save locally vs remote links (default: off)
- **Poster folder**: Local poster storage (default: `Letterboxd/attachments`)

### Metadata Fields
Choose which fields to fetch. Disabling fields speeds up imports.
- Directors, Genres, Description, Cast (top 10)
- Letterboxd Rating, Studios, Countries
- All enabled by default

### Template Customization
Use default template or create your own with Handlebars syntax.

**Available variables**: `{{title}}`, `{{year}}`, `{{rating}}`, `{{directors}}`, `{{genres}}`, `{{cast}}`, `{{description}}`, `{{letterboxdRating}}`, `{{letterboxdUrl}}`, `{{status}}`, `{{watched}}`, `{{cover}}`, `{{coverImage}}`

**Example syntax**:
```handlebars
{{#if directors}}
directors:
{{#each directors}}  - {{this}}
{{/each}}
{{/if}}
```

**Custom template example**:
```handlebars
---
title: {{title}}
year: {{year}}
{{#if rating}}rating: {{rating}}{{/if}}
tags: [movies]
---

# {{title}} ({{year}})

{{#if description}}{{description}}{{/if}}

[Letterboxd]({{letterboxdUrl}})
```

### Rate Limiting
- **Delay between imports**: 200ms default (adjustable 0-5000ms)
- Increase if seeing errors, decrease for small imports

---

## Import Features

### File Selection
Single card with three file options (all optional):
- **Diary entries** (diary.csv) – Dated entries with ratings
- **Watched log** (watched.csv) – All watched movies  
- **Watchlist** (watchlist.csv) – Movies to watch

### Import Options
- **Skip existing movies**: Per-import toggle to avoid reimporting (preserves manual edits)

### Smart Deduplication
When importing diary + watched together, diary entries take precedence to avoid duplicates.

### CSV Validation
Files validated before import:
- Checks required columns (Name, Year, Letterboxd URI, dates)
- Verifies CSV format
- Shows movie count per file

### Real-Time Progress
- Current file and movie being processed
- Progress bar with movie count
- Inline success (✓) and error (✗) counts
- Movie poster preview
- Time elapsed and estimated remaining

### Import Summary
Modal at completion shows:
- Total movies imported
- Error count (if any)
- Total time elapsed

### Keyboard Shortcuts
- **Enter**: Start import (when files selected)
- **Esc**: Cancel import / close modal

---

## Example Output

### Default Template
```yaml
---
title: "The Matrix"
year: 1999
rating: 4.5
cover: "[[Letterboxd/attachments/The Matrix_1999.jpg]]"
description: "Set in the 22nd century..."
directors:
  - The Wachowskis
genres:
  - Science Fiction
  - Action
cast:
  - Keanu Reeves
  - Laurence Fishburne
  - Carrie-Anne Moss
letterboxdRating: 4.3
watched: 2024-10-09
status: Watched
letterboxdUrl: https://letterboxd.com/film/the-matrix/
---

![[Letterboxd/attachments/The Matrix_1999.jpg]]

## Notes
```

### Vault Structure
```
Letterboxd/
├── The Matrix (1999).md
├── Inception (2010).md
└── attachments/
    ├── The Matrix_1999.jpg
    └── Inception_2010.jpg
```

---

## Development

```bash
npm install    # dependencies
npm run dev    # watch mode
npm run build  # production build
npm test       # run tests
```

**Architecture**: TypeScript, esbuild bundler, zero runtime dependencies
- `main.ts` – Modal UI with progress tracking
- `src/csvParser.ts` – CSV parsing with validation
- `src/dataFetcher/` – JSON-LD scraping, poster downloads
- `src/importer.ts` – Import logic, deduplication, rate limiting
- `src/noteGenerator.ts` – Template rendering, frontmatter generation

---

## Advanced Tips

**Template Tips**:
- Use `{{#if field}}` for conditional content
- Use `{{#each array}}{{this}}{{/each}}` for arrays
- Reset to default template anytime in settings

**Import Tips**:
- Validate CSVs before import starts automatically
- Skip existing for incremental updates
- Cancel anytime with Esc key
- Check console for detailed error logs

**Performance**:
- Disable unused metadata fields for faster imports
- Increase rate limit delay if seeing errors
- Default 200ms works for most users

---

## License

MIT © Contributors
