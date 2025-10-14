# Features

## Core Functionality

### CSV Import
- **One-click import** from Letterboxd CSV exports
- **Batch processing** of multiple movies in a single import
- **Progress tracking** with real-time updates during import
- **Error handling** with detailed logging for failed imports

### Movie Note Generation
Each imported movie creates a markdown note with:
- Movie title and year as the heading
- Embedded poster image (optional)
- Structured metadata section with all available info
- Empty notes section for your personal thoughts

### Poster Management
- **Automatic download** of movie poster images from Letterboxd
- **Smart caching** - won't re-download if poster already exists
- **Organized storage** in a separate posters folder
- **Toggle option** to disable poster downloads if preferred

### Data Preservation
All data from the Letterboxd CSV is preserved in the markdown notes:
- **Date**: Original diary entry date
- **Name**: Movie title
- **Year**: Release year
- **Letterboxd URI**: Direct link to the movie page
- **Rating**: Your star rating (displayed with ⭐)
- **Rewatch**: Indicator if you've watched before (shown with 🔁)
- **Tags**: Converted to Obsidian hashtags (#tag-name)
- **Watched Date**: The actual date you watched the movie

## Smart Features

### Duplicate Detection
- Checks if a movie note already exists before importing
- Skips existing movies to avoid duplicates
- Safe to run multiple imports without worry

### File Name Sanitization
- Automatically handles invalid filename characters
- Replaces problematic characters (/, :, *, ?, etc.) with hyphens
- Ensures all generated files are valid on all platforms

### Tag Conversion
- CSV tags are automatically converted to Obsidian hashtags
- Spaces in tags are replaced with hyphens (e.g., "sci-fi action" → "#sci-fi, #action")
- Makes movies easily searchable and queryable in Obsidian

### Folder Management
- Automatically creates output folders if they don't exist
- Keeps all movie notes organized in one location
- Separate folder for poster images

## Settings

### Configurable Options
- **Output Folder**: Choose where movie notes are created (default: `Letterboxd`)
- **Download Posters**: Toggle automatic poster downloads (default: enabled)
- **Poster Folder**: Choose where poster images are saved (default: `Letterboxd/posters`)

## User Experience

### Easy Access
- Command available in Command Palette (Ctrl/Cmd + P)
- Simply search for "Import Letterboxd CSV"
- No complex setup or configuration required

### Progress Feedback
- Visual progress indicator during import
- Shows current movie being processed
- Final summary with success/failure counts

### Error Handling
- Graceful handling of network errors
- Continues processing even if individual movies fail
- Detailed error logging in console for troubleshooting

## Technical Features

### Clean Markdown
- No YAML frontmatter (keeps notes clean and readable)
- Uses Obsidian's native `![[image]]` syntax
- Standard markdown formatting throughout

### Performance
- Small delay between requests to avoid overwhelming servers
- Efficient file operations
- Minimal memory footprint

### Compatibility
- Works on desktop and mobile (posters require network access)
- No external dependencies (uses browser's native fetch API)
- Compatible with Obsidian API v0.15.0+

## Future Enhancements (Potential)

Some features that could be added in future versions:
- Custom note templates
- Sync with Letterboxd API for automatic updates
- Movie metadata from other sources (TMDB, IMDB)
- Batch editing and updating of existing notes
- Export back to CSV
- Integration with Dataview plugin for queries
- Custom frontmatter options
