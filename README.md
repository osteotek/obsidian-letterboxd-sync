# Letterboxd Sync for Obsidian

Import your movie diary from Letterboxd into Obsidian! This plugin reads CSV exports from Letterboxd and creates individual markdown notes for each movie, complete with poster images.

## Features

- 📁 Import movies from Letterboxd CSV exports
- 🎬 Create individual markdown notes for each movie
- 🖼️ Automatically download and embed movie poster images
- 🎭 Scrape directors and genres from Letterboxd pages
- 📋 YAML frontmatter for Dataview compatibility
- ⭐ Preserve all movie metadata (rating, tags, watched date, etc.)
- �� Customizable output folders for notes and images
- 🔄 Smart duplicate detection (won't reimport existing movies)

## Usage

1. Export your movie data from Letterboxd:
   - Go to https://letterboxd.com/settings/data/
   - Click "Export your data"
   - Download the ZIP file and extract the `watched.csv` or `ratings.csv` file

2. In Obsidian, open the Command Palette (Ctrl/Cmd + P)

3. Search for "Import Letterboxd CSV" and select it

4. Choose your CSV file from the file picker

5. Wait for the import to complete - progress will be shown in the modal

## Settings

Configure the plugin in Settings → Letterboxd Sync:

- **Output folder**: Where movie notes will be created (default: `Letterboxd`)
- **Download posters**: Toggle automatic poster image downloads (default: enabled)
- **Poster folder**: Where poster images will be saved (default: `Letterboxd/posters`)

## CSV Format

The plugin expects CSV files with the following columns:
```
Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
```

This matches the standard Letterboxd export format.

## Generated Note Format

Each movie note includes structured YAML frontmatter and content:

```markdown
---
title: "Movie Title"
year: Year
rating: 4.5
cover: "[[poster.jpg]]"
description: "Movie description from Letterboxd"
directors:
  - Director Name
genres:
  - Genre 1
  - Genre 2
cast:
  - Actor 1
  - Actor 2
  - Actor 3
watched: YYYY-MM-DD
rewatch: true
letterboxd: https://letterboxd.com/film/movie-slug/
status: Watched
---

# Movie Title (Year)

![[poster.jpg]]

Tags: #tag1, #tag2

## Notes

(Space for your personal notes)
```

## Development

### Building

```bash
npm install
npm run build
```

### Dev Mode (watch)

```bash
npm run dev
```

## Installation

### From Release

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create a folder in your vault: `VaultFolder/.obsidian/plugins/letterboxd-sync/`
3. Copy the files into that folder
4. Reload Obsidian
5. Enable the plugin in Settings → Community plugins

### Manual

1. Clone this repo
2. `npm install`
3. `npm run build`
4. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's plugins folder

## License

MIT
