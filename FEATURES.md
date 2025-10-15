# Advanced Features Guide

## Table of Contents
1. [Template Customization](#template-customization)
2. [Metadata Field Selection](#metadata-field-selection)
3. [Skip Existing Movies](#skip-existing-movies)
4. [Rate Limiting Configuration](#rate-limiting-configuration)
5. [Import Progress & Validation](#import-progress--validation)

---

## Template Customization

Create custom note formats that match your workflow and vault structure.

### Accessing Template Settings

1. Open Settings → Letterboxd Sync
2. Scroll to "Template Customization" section
3. Change "Template format" to "Custom template"
4. Edit the template in the text area

### Template Syntax

Uses Handlebars-style syntax for dynamic content:

#### Simple Variables
```handlebars
{{title}}         → Movie title
{{year}}          → Release year
{{rating}}        → Your rating (if provided)
{{status}}        → Watched / Want to Watch
{{letterboxdUrl}} → Canonical Letterboxd URL
```

#### Conditional Blocks
```handlebars
{{#if rating}}
rating: {{rating}}
{{/if}}
```

This only includes the rating line if a rating exists.

#### Array Iteration
```handlebars
{{#if directors}}
directors:
{{#each directors}}  - {{this}}
{{/each}}
{{/if}}
```

### Available Variables

| Variable | Type | Description |
|----------|------|-------------|
| `title` | string | Movie title |
| `year` | string | Release year |
| `rating` | string | Your rating (0.5-5.0) |
| `cover` | string | Poster path/URL (formatted for frontmatter) |
| `coverImage` | string | Poster embed (formatted for body) |
| `description` | string | Movie synopsis |
| `directors` | array | List of directors |
| `genres` | array | List of genres |
| `studios` | array | List of production companies |
| `countries` | array | List of countries |
| `cast` | array | List of actors (max 10) |
| `watched` | string | Date watched (YYYY-MM-DD) |
| `rewatch` | boolean | Whether this is a rewatch |
| `letterboxdUrl` | string | Canonical Letterboxd URL |
| `letterboxdRating` | string | Average community rating |
| `status` | string | Watched / Want to Watch |

### Example Templates

#### Minimal Template
```handlebars
---
title: {{title}}
year: {{year}}
tags: [movies]
---

# {{title}} ({{year}})

{{#if description}}{{description}}{{/if}}

## Notes

```

#### Dataview-Friendly Template
```handlebars
---
type: movie
title: "{{title}}"
year: {{year}}
{{#if rating}}rating:: {{rating}}{{/if}}
{{#if watched}}watched:: {{watched}}{{/if}}
{{#if directors}}director:: {{#each directors}}[[{{this}}]]{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
{{#if genres}}genre:: {{#each genres}}#{{this}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
status:: {{status}}
letterboxd:: {{letterboxdUrl}}
---

{{#if coverImage}}{{coverImage}}{{/if}}

## Overview
{{#if description}}{{description}}{{/if}}

## Notes

```

#### Card-Style Template
```handlebars
---
title: {{title}} ({{year}})
{{#if cover}}banner: {{cover}}{{/if}}
---

# 🎬 {{title}}

{{#if rating}}⭐ **My Rating:** {{rating}}/5{{/if}}
{{#if letterboxdRating}}📊 **Letterboxd:** {{letterboxdRating}}/5{{/if}}

{{#if directors}}
**Directed by:** {{#each directors}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{#if genres}}
**Genres:** {{#each genres}}{{this}}{{#unless @last}} • {{/unless}}{{/each}}
{{/if}}

{{#if description}}
## Synopsis
{{description}}
{{/if}}

## My Thoughts

---
[View on Letterboxd]({{letterboxdUrl}})
```

### Tips

- Use the "Reset to default" button to restore the original template
- Test your template on a small CSV first
- Variables that don't exist or are empty will be omitted
- Arrays that are empty won't render their {{#each}} blocks
- Use `{{#unless @last}}` inside {{#each}} to handle separators

---

## Metadata Field Selection

Control which metadata fields are fetched from Letterboxd to optimize import speed.

### Why Disable Fields?

- **Faster imports**: Fetching less data speeds up processing
- **Cleaner notes**: Only include metadata you actually use
- **Bandwidth savings**: Reduces data transferred from Letterboxd
- **Rate limit protection**: Fewer requests per movie

### Available Fields

All fields are **enabled by default** for backward compatibility.

| Field | Impact | Typical Size |
|-------|--------|--------------|
| Directors | Low | 1-3 names |
| Genres | Low | 2-4 genres |
| Description | Medium | 200-500 chars |
| Cast | High | 10 names |
| Letterboxd Rating | Low | 1 number |
| Studios | Low | 1-3 companies |
| Countries | Low | 1-3 countries |

### Recommendations

**For Fast Imports:**
- Disable: Cast, Studios, Countries, Description
- Keep: Directors, Genres, Letterboxd Rating

**For Complete Records:**
- Keep all fields enabled

**For Minimal Notes:**
- Disable: Cast, Studios, Countries, Description, Letterboxd Rating
- Keep: Directors, Genres

### How Filtering Works

Disabled fields:
- Are not fetched from Letterboxd (saves time)
- Won't appear in generated notes
- Still work with custom templates (they'll just be empty)

---

## Skip Existing Movies

Avoid reimporting movies that already exist in your vault.

### Accessing the Option

The "Skip existing movies" option is available in the import modal, not in the plugin settings. This gives you flexibility to choose per-import whether to skip or update existing movies.

1. Open the import modal (Command Palette → "Import Letterboxd CSV")
2. Select your CSV files
3. In the "Import Options" card, toggle "Skip existing movies"
4. Click Import

### Use Cases

- **Incremental imports**: Add new movies without touching old ones
- **Multiple sources**: Import from different CSV files without duplicates
- **Preserve edits**: Keep your manual changes to existing notes
- **Faster updates**: Only import what's new

### How It Works

1. Toggle the checkbox in the import modal's "Import Options" section
2. During import, plugin checks if each movie file already exists
3. Existing movies are skipped, only new movies are imported
4. You'll see a notification: "Skipped X existing movies"

### Per-Import Setting

This setting is intentionally **not saved** in your plugin settings. Each time you open the import modal:
- The checkbox defaults to your last saved setting
- You can toggle it on or off for this specific import
- Your choice doesn't persist to the next import

This design gives you maximum flexibility—sometimes you want to skip existing movies, sometimes you want to update them.

### File Matching

Movies are matched by filename:
- Format: `Movie Title (Year).md`
- Example: `The Matrix (1999).md`
- Case-sensitive matching
- Must be in the configured output folder

### Important Notes

- Skipped movies don't trigger metadata fetching (saves time)
- Your edits to existing notes are preserved
- To update existing movies, leave the checkbox unchecked
- Works with both individual and batch imports
- Setting is per-import for maximum flexibility

---

## Rate Limiting Configuration

Configure the delay between movie imports to avoid overwhelming Letterboxd's servers.

### What is Rate Limiting?

Letterboxd (like all websites) has limits on how many requests you can make. The plugin adds a delay between each movie import to stay within these limits.

### Default Setting

- **200ms** (0.2 seconds) between movies
- Suitable for most users
- Allows ~5 movies per second

### When to Adjust

**Increase delay (300-500ms) if:**
- You see import failures or timeouts
- Importing very large collections (1000+ movies)
- You have a slow internet connection
- Being extra cautious

**Decrease delay (100-150ms) if:**
- Small imports (<100 movies)
- Fast, reliable internet connection
- Previous imports worked flawlessly

**Set to 0ms if:**
- Testing with local/mocked data
- **NOT recommended for real imports**

### Calculation Examples

| Delay | Movies/Second | 500 Movies | 1000 Movies |
|-------|---------------|------------|-------------|
| 100ms | ~10 | ~50 sec | ~1.7 min |
| 200ms | ~5 | ~1.7 min | ~3.3 min |
| 300ms | ~3.3 | ~2.5 min | ~5 min |
| 500ms | ~2 | ~4.2 min | ~8.3 min |

*Note: Times include metadata fetching, which adds 200-500ms per movie*

### Best Practices

- Start with default (200ms)
- Increase if you see errors
- Monitor success/error counts during import
- Longer delay = more polite, less likely to be rate limited

---

## Import Progress & Validation

Enhanced import experience with modern UI, validation, progress tracking, and summaries.

### File Selection Interface

The import modal features a **single-card interface** for selecting CSV files:

**One Card, Three File Options:**
Within a single "Select CSV Files" card, you can choose:
1. **Diary entries** (diary.csv) – Diary entries with dates and ratings
2. **Watched log** (watched.csv) – All watched movies  
3. **Watchlist** (watchlist.csv) – Movies to watch

**Each file row displays:**
- File type label (e.g., "Diary entries")
- Description of what the file contains
- Selected filename display (or "No file selected")
- "Choose File" button

**Visual feedback:**
- Rows highlight with accent color when file is selected
- Filename displays in monospace font
- Hover effects on each row
- Clean, organized layout within one card

### Import Options

Below the file cards, an **Import Options** card provides:
- **Skip existing movies** toggle
- Clear description of what the option does
- Easy to see and change before each import

### CSV Validation

**Before** import starts, all CSV files are validated:

✓ Required columns exist (Name, Year, Letterboxd URI)
✓ Date fields present (Watched Date or Date)
✓ Valid movie entries found
✓ Proper CSV format

**What you'll see:**
- Error message if validation fails (with specific issue)
- Success notification showing movie count per file
- Import button remains disabled until validation passes

### Real-Time Progress

During import, the modal shows:

**File Progress:**
- Current file name (diary.csv, watched.csv, etc.)
- File number (e.g., "File 2/3")

**Movie Progress:**
- Current movie being processed
- Progress bar (visual percentage)
- Count (e.g., "42/150")
- Movie poster preview (if available)

**Timing:**
- Time elapsed (updates every second)
- Estimated time remaining (after 2+ movies)

**Success/Error Tracking:**
- ✅ Success count (green) - Successfully imported
- ❌ Error count (red) - Failed to import

### Keyboard Shortcuts

| Key | Action | When Available |
|-----|--------|----------------|
| Enter | Start import | Files selected, not importing |
| Escape | Cancel import / Close | Anytime |

### Import Summary

When import completes (or is cancelled), a summary modal shows:

**For Completed Imports:**
- "Import Complete" title
- Movies imported (success count)
- Failed imports (if any)
- Total time elapsed
- Close button (can press Enter)

**For Cancelled Imports:**
- "Import Cancelled" title
- Partial progress shown
- Movies imported before cancellation
- Time elapsed

### Error Handling

**Individual Movie Errors:**
- Logged to console with details
- Don't stop the import
- Counted in error statistics
- Shown in summary

**Fatal Errors:**
- Import stops immediately
- Error message displayed
- Partial progress saved
- Summary still shown

### Tips

- Watch success/error counts during import
- Cancel anytime with Escape key
- Check console for error details
- Increase rate limit delay if seeing many errors
- Summary gives you final stats for record-keeping
