# Letterboxd Sync for Obsidian

Import your Letterboxd viewing history into Obsidian with a modern, real-time progress interface. Automatically fetches movie metadata, posters, and creates beautifully formatted notes.

---

## Features

- **Modern UI** – Card-based interface with live progress tracking and movie poster preview
- **Smart import** – Multi-file support with automatic deduplication (diary + watched)
- **Rich metadata** – Directors, cast, genres, studios, countries, ratings from JSON-LD
- **Poster management** – Download locally or link remotely, skips existing files
- **Real-time stats** – Progress bar, time elapsed, ETA, current movie display with success/error counts
- **Custom templates** – Define your own note format with Handlebars-style syntax
- **Flexible metadata** – Choose which metadata fields to fetch and include
- **Skip existing** – Option to avoid reimporting movies already in your vault
- **Rate limiting** – Configurable delay between imports to prevent rate limiting
- **Safe & clean** – Auto folder creation, filename sanitization, graceful cancellation
- **Keyboard shortcuts** – Press Enter to start import, Esc to cancel

---

## Quick Start

1. **Export** from Letterboxd (Settings → Data → Export)
2. **Install** plugin: Copy `main.js`, `manifest.json`, `styles.css` to `.obsidian/plugins/letterboxd-sync/`
3. **Import** via Command Palette → "Import Letterboxd CSV"
   - Choose one or more CSV files in the single file selection card
   - Toggle "Skip existing movies" if you want to avoid reimporting
   - Watch real-time progress with movie posters and stats
   - Close modal or press Esc to cancel anytime
   - Close modal or click Cancel (or press Esc) to stop anytime

---

## Settings

### Basic Settings

| Setting | Default | Description |
| --- | --- | --- |
| Output folder | `Letterboxd` | Where movie notes are saved |

### Poster Settings

| Setting | Default | Description |
| --- | --- | --- |
| Download posters | Off | Save posters locally vs. remote links |
| Poster folder | `Letterboxd/attachments` | Local poster storage |

### Metadata Fields

Choose which metadata fields to fetch from Letterboxd. Disabling fields improves import speed.

| Field | Default | Description |
| --- | --- | --- |
| Directors | On | Include director information |
| Genres | On | Include genre information |
| Description | On | Include movie synopsis |
| Cast | On | Include cast information (first 10 actors) |
| Letterboxd Rating | On | Include average community rating |
| Studios | On | Include production companies |
| Countries | On | Include countries of origin |

### Template Customization

| Setting | Default | Description |
| --- | --- | --- |
| Template format | Default | Choose between default or custom template |
| Custom template | - | Define your own note format using Handlebars syntax |

**Available template variables:**
- `{{title}}`, `{{year}}`, `{{rating}}`, `{{status}}`
- `{{directors}}`, `{{genres}}`, `{{cast}}`, `{{studios}}`, `{{countries}}`
- `{{description}}`, `{{letterboxdRating}}`, `{{letterboxdUrl}}`
- `{{cover}}`, `{{coverImage}}` (formatted image embed)
- `{{watched}}`, `{{rewatch}}`

**Template syntax examples:**
```handlebars
{{#if directors}}
directors:
{{#each directors}}  - {{this}}
{{/each}}
{{/if}}
```

### Performance & Rate Limiting

| Setting | Default | Description |
| --- | --- | --- |
| Rate limit delay | 200ms | Delay between movie imports (0-5000ms) |

---

## Import Process

### File Selection
The import modal features a clean, single-card interface for selecting CSV files. Within one card, you can choose:
- **Diary entries** (diary.csv) – Diary entries with dates and ratings
- **Watched log** (watched.csv) – All movies you've watched
- **Watchlist** (watchlist.csv) – Movies you want to watch

Each file row shows:
- File type label and description
- Selected filename display (or "No file selected")
- "Choose File" button to browse

Rows highlight when a file is selected, making it easy to see what you're importing.

### Import Options
Before starting the import, you can toggle:
- **Skip existing movies** – Movies that already exist in your vault will not be updated or reimported
  - Useful for incremental imports
  - Preserves your manual edits
  - Shows count of skipped movies

### CSV Validation
Before import begins, all selected CSV files are validated to ensure:
- Required columns exist (Name, Year, Letterboxd URI, date fields)
- Valid movie entries are present
- Proper CSV format

You'll see a notification with the number of movies found in each file.

### Real-Time Progress
During import, you'll see:
- Current file being processed
- Progress bar with current/total movies
- Current movie name with poster preview
- Time elapsed and estimated time remaining
- **Success count** – Movies successfully imported (green)
- **Error count** – Movies that failed to import (red)

### Keyboard Shortcuts
- **Enter** – Start import (when files are selected)
- **Esc** – Cancel import or close modal

### Import Summary
When import completes (or is cancelled), a summary modal displays:
- Total movies imported successfully
- Number of failures (if any)
- Total time elapsed

### Skip Existing Movies
Enable "Skip existing movies" in the import modal options to:
- Avoid reimporting movies already in your vault
- Speed up incremental imports
- See count of skipped movies in notifications

This setting is per-import, not saved globally, giving you flexibility each time you import.

---

## Smart Deduplication

When importing both `diary.csv` and `watched.csv`, the plugin automatically excludes diary movies from watched to prevent duplicates. Diary entries (with dates, ratings) take precedence.

---

## Example Output

### Default Template

\`\`\`yaml
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
\`\`\`

### Custom Template Example

You can create your own template format in settings. Here's a minimal example:

\`\`\`handlebars
---
title: {{title}}
year: {{year}}
{{#if rating}}my-rating: {{rating}}{{/if}}
{{#if directors}}director: {{#each directors}}{{this}}{{/each}}{{/if}}
tags: [movies, letterboxd]
---

# {{title}} ({{year}})

{{#if description}}
**Synopsis:** {{description}}
{{/if}}

{{#if genres}}**Genres:** {{#each genres}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}

**Letterboxd:** [View on Letterboxd]({{letterboxdUrl}})

## My Thoughts

\`\`\`

This produces:

\`\`\`yaml
---
title: The Matrix
year: 1999
my-rating: 4.5
director: The Wachowskis
tags: [movies, letterboxd]
---

# The Matrix (1999)

**Synopsis:** Set in the 22nd century...

**Genres:** Science Fiction, Action

**Letterboxd:** [View on Letterboxd](https://letterboxd.com/film/the-matrix/)

## My Thoughts
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
