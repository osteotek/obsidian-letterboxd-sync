# Letterboxd Sync - Obsidian Plugin

An Obsidian plugin that imports your Letterboxd movie diary from CSV export and creates beautiful markdown notes with movie information and poster images.

## Features

- 📝 Import movies from Letterboxd CSV export
- 🎬 Create individual markdown notes for each movie
- 🖼️ Automatically download and embed poster images
- 📊 Preserve all metadata (ratings, watched dates, tags, rewatch status)
- ⚙️ Configurable output and image folders

## Installation

### Manual Installation

1. Download `main.js` and `manifest.json` from the latest release
2. Create a folder named `letterboxd-sync` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into that folder
4. Reload Obsidian
5. Enable the plugin in Settings → Community Plugins

### Development

```bash
git clone https://github.com/osteotek/obsidian-letterboxd-sync.git
cd obsidian-letterboxd-sync
npm install
npm run build
```

## Usage

### Exporting from Letterboxd

1. Go to [Letterboxd Settings](https://letterboxd.com/settings/data/)
2. Under "Export your data", click "EXPORT YOUR DATA"
3. Download the zip file and extract it
4. Find the `diary.csv` file

### Importing into Obsidian

1. Open Obsidian command palette (Ctrl/Cmd + P)
2. Search for "Import Letterboxd CSV"
3. Select your `diary.csv` file
4. Wait for the import to complete

The plugin will:
- Create a folder (default: `Letterboxd/`) in your vault
- Generate a markdown note for each movie
- Download poster images (if enabled) to an images folder
- Skip movies that have already been imported

## CSV Format

The plugin expects the standard Letterboxd diary export format:

```csv
Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
2016-12-01,Shenzhen: The Silicon Valley of Hardware,2016,https://boxd.it/ckrs5,2.5,,,2016-11-30
2016-12-01,World of Tomorrow,2015,https://boxd.it/ckrVB,5,Yes,,2016-11-30
```

## Generated Note Format

Each movie note includes:

```markdown
---
title: "Movie Name"
year: 2015
rating: 5
watched: 2016-11-30
rewatch: true
tags: ["tag1", "tag2"]
letterboxd: https://boxd.it/xxxxx
---

# Movie Name (2015)

![[Letterboxd/images/Movie-Name-2015.jpg]]

## Details

**Rating:** 5/5
**Watched:** 2016-11-30
**Rewatch:** Yes
**Tags:** tag1, tag2
**Letterboxd:** https://boxd.it/xxxxx

## Notes

```

## Settings

- **Output folder**: Where movie notes will be created (default: `Letterboxd`)
- **Download images**: Enable/disable automatic poster image downloads (default: enabled)
- **Image folder**: Where poster images will be saved (default: `Letterboxd/images`)

## Privacy & Performance

- The plugin fetches poster images directly from Letterboxd's public pages
- No personal data is sent to third parties
- Images are stored locally in your vault
- Import is processed entirely on your device

## Troubleshooting

**Images not downloading**: Check your internet connection and ensure Letterboxd is accessible. Some corporate networks may block image downloads.

**CSV parsing errors**: Ensure you're using the official Letterboxd export format. Check that the file is not corrupted.

**Duplicate notes**: The plugin checks for existing files by movie name and year. If you want to re-import, delete the existing notes first.

## License

MIT

## Support

If you encounter issues or have feature requests, please [open an issue](https://github.com/osteotek/obsidian-letterboxd-sync/issues) on GitHub.
