# Shot Manager - Future Feature Ideas

Created: 2026-01-25

## Organization & Management

| Feature | Description |
|---------|-------------|
| **Folders/Collections** | Let users create custom folders to group captures beyond tags |
| **Smart Collections** | Auto-populated folders based on rules (e.g., "All videos over 1 min") |
| **Multi-select + Batch ops** | Select multiple items for bulk delete, tag, move, export |
| **Favorites/Starring** | Quick-mark important captures for easy access |
| **Search** | Full-text search on filenames, tags, and OCR-extracted text |

## Editing & Enhancement

| Feature | Description |
|---------|-------------|
| **Screenshot Annotations** | Draw arrows, boxes, blur regions, add text overlays |
| **Video Trimming** | Cut start/end of recordings without external software |
| **Crop & Resize** | Quick resize for social media dimensions |
| **GIF Export** | Convert short video clips to animated GIFs |

## Productivity

| Feature | Description |
|---------|-------------|
| **Quick Share** | One-click upload to Imgur, CloudApp, custom S3 bucket |
| **Copy to Clipboard** | Instant clipboard copy for pasting into other apps |
| **OCR Text Extraction** | Extract text from screenshots (useful for error messages) |
| **Recording Scheduler** | Schedule captures at specific times |
| **Auto-cleanup Rules** | Delete captures older than X days automatically |

## Capture Enhancements

| Feature | Description |
|---------|-------------|
| **Scrolling Screenshot** | Capture entire webpage/document by auto-scrolling |
| **Delayed Capture** | Timer before screenshot (3s, 5s, 10s countdown) |
| **Audio-only Recording** | Record system/mic audio without video |
| **Webcam Overlay** | Picture-in-picture webcam during screen recording |
| **Drawing During Recording** | Annotate screen in real-time while recording |

## Cloud & Sync

| Feature | Description |
|---------|-------------|
| **Cloud Backup** | Sync to Google Drive, Dropbox, OneDrive |
| **Cross-device Sync** | Access captures from multiple machines |
| **Share Links** | Generate shareable links with optional expiry |

## Quality of Life

| Feature | Description |
|---------|-------------|
| **Duplicate Detection** | Find and remove similar/duplicate captures |
| **Storage Analytics** | Dashboard showing disk usage by type, date, folder |
| **Export/Import Library** | Backup entire database + files for migration |
| **Keyboard Shortcut Editor** | Let users customize all hotkeys |

---

## Recommended Priorities

Based on current limitations (no multi-select, no folders, tags-only grouping):

1. **Multi-select + batch operations** - Fills an immediate gap in usability
2. **Folders/collections** - Users expect hierarchical organization
3. **Quick annotations** - High value add for screenshot workflows
4. **Video trimming** - Avoids needing external tools

## Implementation Notes

- Multi-select should integrate with existing Gallery component
- Folders would require new database tables and UI components
- Annotations could use canvas-based drawing library (fabric.js, konva)
- Video trimming could leverage ffmpeg via ffmpeg-static
