# Changelog

## [Unreleased]

### Added
- **Single-Card File Selection UI**: Compact, organized file chooser interface
  - All three file options (diary, watched, watchlist) in one card
  - Each file type has its own row with label, description, filename display, and button
  - Visual feedback when files are selected (row highlights)
  - Cleaner, more space-efficient design than separate cards
  
- **Import Options in Modal**: Skip existing movies option moved to import modal
  - Per-import setting for maximum flexibility
  - Toggle before each import
  - Not saved globally, defaults to last plugin setting
  - Clear description in dedicated options card
  
- **Template Customization**: Define custom note templates with Handlebars-style syntax
  - Choose between default and custom templates in settings
  - Full control over frontmatter and note structure
  - Available template variables: title, year, rating, directors, genres, cast, description, and more
  
- **Metadata Field Selection**: Granular control over which metadata to fetch
  - Toggle individual fields: directors, genres, description, cast, letterboxdRating, studios, countries
  - Disabled fields are not fetched, improving import speed
  - All fields enabled by default for backward compatibility
  
- **Configurable Rate Limiting**: Adjust delay between movie imports
  - Default: 200ms between imports
  - Configurable from 0-5000ms in settings
  - Helps avoid rate limiting from Letterboxd
  
- **Import Progress Enhancements**:
  - Real-time success/error counts during import
  - CSV validation before import starts
  - Keyboard shortcuts (Enter to import, Esc to cancel)
  - Import summary modal at completion showing final statistics

### Changed
- Settings UI reorganized into logical sections
- Enhanced settings with better descriptions and tooltips
- Updated note generation to support filtered metadata and custom templates
- Skip existing movies is now a per-import option in modal instead of global setting
- File selection UI completely redesigned with card-based interface

### Technical
- `LetterboxdSyncSettings` interface extended with new options
- `MetadataFieldsConfig` interface for controlling metadata fetching
- Template rendering engine for custom note formats
- CSV validation before import processing
- Modal UI components reorganized for better UX
