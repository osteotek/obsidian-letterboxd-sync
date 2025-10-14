# Letterboxd Sync for Obsidian

Bring your Letterboxd diary into Obsidian with one command. The plugin reads Letterboxd CSV exports, resolves each film’s canonical page, downloads the poster, and generates a richly annotated note per movie.

---

## Highlights

- **One-step import** – batch process any Letterboxd CSV export (`watched.csv`, `ratings.csv`, etc.).
- **Rich metadata** – JSON‑LD scraping adds title, year, description, directors, genres, and the first ten cast members.
- **Poster handling** – downloads posters via Obsidian’s `requestUrl`, stores them in `Letterboxd/attachments`, and skips files that already exist.
- **Clean notes** – YAML frontmatter for Dataview, embedded poster, converted tags, and a ready‑to‑edit notes section.
- **Safe re-runs** – duplicate detection, file-name sanitisation, and automatic folder creation keep your vault tidy.

---

## Quick Start

1. **Export from Letterboxd**  
   Visit <https://letterboxd.com/settings/data/>, export your data, unzip it, and pick the CSV you want (e.g. `watched.csv`).

2. **Install the plugin**  
   Copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/letterboxd-sync/`, reload Obsidian, and enable the plugin.

3. **Run the import**  
   Open the Command Palette → “Import Letterboxd CSV” → choose your CSV. Progress appears in the modal; posters land in `Letterboxd/attachments/`.

---

## Settings

| Option | Default | Description |
| --- | --- | --- |
| Output folder | `Letterboxd` | Destination for generated movie notes. |
| Download posters | Enabled | Toggle automatic poster downloads. |
| Poster folder | `Letterboxd/attachments` | Storage location for poster images. |

The plugin creates folders on demand and reuses existing posters when present.

---

## Output at a Glance

```markdown
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
watched: 2024-10-09
letterboxd: https://letterboxd.com/film/the-matrix/
status: Watched
---

![[Letterboxd/attachments/The Matrix_1999.jpg]]

Tags: #sci-fi, #action

## Notes
```

Resulting vault structure:

```
Letterboxd/
├── The Matrix (1999).md
├── …other movies…
└── attachments/
    ├── The Matrix_1999.jpg
    ├── Inception_2010.jpg
    └── …
```

---

## Under the Hood (TL;DR)

- `src/csvParser.ts` – Parses Letterboxd CSV exports (quoted fields included).
- `src/dataFetcher/` – Resolves canonical film URLs, parses JSON‑LD metadata, and downloads posters with Obsidian’s `requestUrl`.
- `src/noteGenerator.ts` – Produces YAML frontmatter + note body and sanitises filenames.
- `src/importer.ts` – Orchestrates the import run, handles duplicates, and reports progress.
- `src/settings.ts` – Persists user preferences via Obsidian’s settings UI.

Everything is TypeScript, bundled with esbuild, and free of runtime dependencies.

---

## Development

```bash
npm install        # install dependencies
npm run dev        # watch mode
npm run build      # type-check + bundle
npm run test       # vitest unit + integration (requires network)
```

Place the resulting `main.js`, `manifest.json`, and `styles.css` into your vault’s plugins directory for manual testing.

---

## License

MIT © Contributors
