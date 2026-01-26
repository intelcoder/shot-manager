# Phase 6: Dashboard UI

## Objective
Build the main dashboard window with gallery view, search functionality, and tag management.

## Dependencies
- Phase 5 completed (file management working)

---

## 6.1 Dashboard Layout

### Overall Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  Shot Manager                                        [—] [□] [×] │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ 🔍 Search...                    [Screenshots ▼] [All Tags ▼] ││
│  └──────────────────────────────────────────────────────────────┘│
├────────────┬─────────────────────────────────────────────────────┤
│            │                                                     │
│  Sidebar   │                   Gallery                           │
│            │                                                     │
│  📅 Today  │   ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐               │
│  📅 Week   │   │     │  │     │  │     │  │     │               │
│  📅 Month  │   │ img │  │ img │  │ vid │  │ img │               │
│  📅 All    │   │     │  │     │  │ ▶   │  │     │               │
│            │   └─────┘  └─────┘  └─────┘  └─────┘               │
│  ──────    │   name.png name.png name.mp4 name.png               │
│            │                                                     │
│  🏷 Tags   │   ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐               │
│  • Work    │   │     │  │     │  │     │  │     │               │
│  • Personal│   │ img │  │ img │  │ img │  │ img │               │
│  • Bug     │   │     │  │     │  │     │  │     │               │
│            │   └─────┘  └─────┘  └─────┘  └─────┘               │
│            │                                                     │
│  ──────    │                                                     │
│            │                                                     │
│  ⚙ Settings│                                                     │
│            │                                                     │
└────────────┴─────────────────────────────────────────────────────┘
```

---

## 6.2 Component Architecture

### Component Tree

```
Dashboard/
├── Layout.tsx           # Main layout wrapper
├── Header/
│   ├── SearchBar.tsx    # Search input with filters
│   └── FilterDropdowns.tsx
├── Sidebar/
│   ├── Sidebar.tsx      # Sidebar container
│   ├── DateFilters.tsx  # Today/Week/Month/All
│   ├── TagList.tsx      # Tag filter list
│   └── SettingsLink.tsx
├── Gallery/
│   ├── Gallery.tsx      # Grid container
│   ├── GalleryItem.tsx  # Individual thumbnail
│   ├── VideoThumbnail.tsx
│   └── EmptyState.tsx
├── DetailView/
│   ├── DetailModal.tsx  # Full preview modal
│   ├── ImageViewer.tsx
│   ├── VideoPlayer.tsx
│   └── TagEditor.tsx
└── Settings/
    ├── SettingsPanel.tsx
    ├── GeneralSettings.tsx
    ├── FileSettings.tsx
    └── ShortcutSettings.tsx
```

---

## 6.3 Gallery View

### Gallery Grid Component

```typescript
// src/renderer/components/dashboard/Gallery.tsx
interface GalleryProps {
  items: CaptureItem[];
  isLoading: boolean;
  onItemClick: (item: CaptureItem) => void;
  onItemDelete: (item: CaptureItem) => void;
  onItemTag: (item: CaptureItem) => void;
}

function Gallery({ items, isLoading, onItemClick, onItemDelete, onItemTag }: GalleryProps) {
  if (isLoading) {
    return <LoadingGrid />;
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      {items.map((item) => (
        <GalleryItem
          key={item.id}
          item={item}
          onClick={() => onItemClick(item)}
          onDelete={() => onItemDelete(item)}
          onTag={() => onItemTag(item)}
        />
      ))}
    </div>
  );
}
```

### Gallery Item Component

```typescript
// src/renderer/components/dashboard/GalleryItem.tsx
interface GalleryItemProps {
  item: CaptureItem;
  onClick: () => void;
  onDelete: () => void;
  onTag: () => void;
}

function GalleryItem({ item, onClick, onDelete, onTag }: GalleryItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative group cursor-pointer rounded-lg overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-100">
        {item.type === 'video' ? (
          <VideoThumbnail src={item.filepath} />
        ) : (
          <img src={`file://${item.filepath}`} alt={item.filename} />
        )}
      </div>

      {/* Overlay on hover */}
      {isHovered && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onTag(); }}>
            🏷
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            🗑
          </button>
        </div>
      )}

      {/* Video indicator */}
      {item.type === 'video' && (
        <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
          ▶ {formatDuration(item.duration)}
        </div>
      )}

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="absolute top-2 left-2 flex gap-1">
          {item.tags.slice(0, 2).map((tag) => (
            <span key={tag.id} className="bg-blue-500 text-white text-xs px-2 rounded">
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Filename */}
      <div className="p-2 text-sm truncate">
        {item.filename}
      </div>
    </div>
  );
}
```

### Visual Design - Gallery Item
```
┌─────────────────────┐
│ [Work] [Bug]        │  ← Tags
│                     │
│    Thumbnail        │
│      Image          │
│                     │
│              ▶ 1:30 │  ← Video duration
└─────────────────────┘
  filename.png          ← Filename

Hover state:
┌─────────────────────┐
│██████████████████████│
│██████ [🏷] [🗑] █████│  ← Action buttons
│██████████████████████│
└─────────────────────┘
```

---

## 6.4 Search & Filtering

### Search Store

```typescript
// src/renderer/stores/search-store.ts
interface SearchFilters {
  query: string;
  type: 'all' | 'screenshot' | 'video';
  dateRange: 'today' | 'week' | 'month' | 'all' | 'custom';
  tags: string[];
  startDate?: Date;
  endDate?: Date;
}

interface SearchStore {
  filters: SearchFilters;
  results: CaptureItem[];
  isLoading: boolean;

  setQuery: (query: string) => void;
  setType: (type: SearchFilters['type']) => void;
  setDateRange: (range: SearchFilters['dateRange']) => void;
  toggleTag: (tagId: string) => void;
  search: () => Promise<void>;
  reset: () => void;
}
```

### Search Bar Component

```typescript
// src/renderer/components/dashboard/SearchBar.tsx
function SearchBar() {
  const { filters, setQuery, setType, search } = useSearchStore();
  const debouncedSearch = useDebouncedCallback(search, 300);

  return (
    <div className="flex items-center gap-4 p-4 border-b">
      {/* Search Input */}
      <div className="flex-1 relative">
        <input
          type="text"
          placeholder="Search by filename..."
          value={filters.query}
          onChange={(e) => {
            setQuery(e.target.value);
            debouncedSearch();
          }}
          className="w-full pl-10 pr-4 py-2 border rounded-lg"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2">🔍</span>
      </div>

      {/* Type Filter */}
      <select
        value={filters.type}
        onChange={(e) => setType(e.target.value as any)}
        className="border rounded-lg px-4 py-2"
      >
        <option value="all">All Types</option>
        <option value="screenshot">Screenshots</option>
        <option value="video">Videos</option>
      </select>
    </div>
  );
}
```

---

## 6.5 Tag Management

### Tag Data Model

```typescript
interface Tag {
  id: number;
  name: string;
  color?: string;
  captureCount: number;  // For display
}

interface CaptureItem {
  id: number;
  type: 'screenshot' | 'video';
  filename: string;
  filepath: string;
  tags: Tag[];
  // ... other fields
}
```

### Tag Editor Component

```typescript
// src/renderer/components/dashboard/TagEditor.tsx
interface TagEditorProps {
  capture: CaptureItem;
  allTags: Tag[];
  onAddTag: (captureId: number, tagName: string) => void;
  onRemoveTag: (captureId: number, tagId: number) => void;
  onCreateTag: (name: string) => void;
}

function TagEditor({ capture, allTags, onAddTag, onRemoveTag, onCreateTag }: TagEditorProps) {
  const [newTag, setNewTag] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const availableTags = allTags.filter(
    (tag) => !capture.tags.find((t) => t.id === tag.id)
  );

  const handleAddTag = (tag: Tag) => {
    onAddTag(capture.id, tag.name);
    setShowDropdown(false);
  };

  const handleCreateTag = () => {
    if (newTag.trim()) {
      onCreateTag(newTag.trim());
      onAddTag(capture.id, newTag.trim());
      setNewTag('');
    }
  };

  return (
    <div className="tag-editor">
      {/* Current Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {capture.tags.map((tag) => (
          <span
            key={tag.id}
            className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2"
          >
            {tag.name}
            <button onClick={() => onRemoveTag(capture.id, tag.id)}>×</button>
          </span>
        ))}
      </div>

      {/* Add Tag Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Add tag..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onFocus={() => setShowDropdown(true)}
        />

        {/* Suggestions Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 w-full bg-white border rounded shadow-lg">
            {availableTags
              .filter((t) => t.name.toLowerCase().includes(newTag.toLowerCase()))
              .map((tag) => (
                <div
                  key={tag.id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleAddTag(tag)}
                >
                  {tag.name}
                </div>
              ))}
            {newTag && !allTags.find((t) => t.name === newTag) && (
              <div
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-blue-600"
                onClick={handleCreateTag}
              >
                Create "{newTag}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 6.6 Sidebar

### Sidebar Component

```typescript
// src/renderer/components/dashboard/Sidebar.tsx
function Sidebar() {
  const { filters, setDateRange, toggleTag } = useSearchStore();
  const { tags } = useTagStore();

  return (
    <aside className="w-64 border-r h-full flex flex-col">
      {/* Date Filters */}
      <div className="p-4 border-b">
        <h3 className="font-semibold mb-2">Date</h3>
        <nav className="space-y-1">
          {['today', 'week', 'month', 'all'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range as any)}
              className={`w-full text-left px-3 py-2 rounded ${
                filters.dateRange === range ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
            >
              {range === 'today' && '📅 Today'}
              {range === 'week' && '📅 This Week'}
              {range === 'month' && '📅 This Month'}
              {range === 'all' && '📅 All Time'}
            </button>
          ))}
        </nav>
      </div>

      {/* Tags */}
      <div className="p-4 flex-1 overflow-auto">
        <h3 className="font-semibold mb-2">Tags</h3>
        <nav className="space-y-1">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={`w-full text-left px-3 py-2 rounded flex justify-between ${
                filters.tags.includes(tag.id) ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
            >
              <span>🏷 {tag.name}</span>
              <span className="text-gray-400">{tag.captureCount}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Link */}
      <div className="p-4 border-t">
        <button className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded">
          ⚙ Settings
        </button>
      </div>
    </aside>
  );
}
```

---

## 6.7 Detail View Modal

### Modal Component

```typescript
// src/renderer/components/dashboard/DetailModal.tsx
interface DetailModalProps {
  item: CaptureItem | null;
  onClose: () => void;
  onDelete: (item: CaptureItem) => void;
  onOpenFile: (item: CaptureItem) => void;
  onShowInFolder: (item: CaptureItem) => void;
}

function DetailModal({ item, onClose, onDelete, onOpenFile, onShowInFolder }: DetailModalProps) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold">{item.filename}</h2>
          <button onClick={onClose}>×</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {item.type === 'video' ? (
            <video src={`file://${item.filepath}`} controls className="w-full" />
          ) : (
            <img src={`file://${item.filepath}`} alt={item.filename} className="w-full" />
          )}
        </div>

        {/* Info & Actions */}
        <div className="p-4 border-t">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-gray-500">Size:</span> {formatSize(item.size)}
            </div>
            <div>
              <span className="text-gray-500">Date:</span> {formatDate(item.created_at)}
            </div>
            {item.type === 'video' && (
              <div>
                <span className="text-gray-500">Duration:</span> {formatDuration(item.duration)}
              </div>
            )}
            <div>
              <span className="text-gray-500">Dimensions:</span> {item.width} × {item.height}
            </div>
          </div>

          {/* Tags */}
          <TagEditor capture={item} />

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <button onClick={() => onOpenFile(item)}>Open</button>
            <button onClick={() => onShowInFolder(item)}>Show in Folder</button>
            <button onClick={() => onDelete(item)} className="text-red-600">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 6.8 Styling with Tailwind CSS

### tailwind.config.js
```javascript
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
      },
    },
  },
  plugins: [],
};
```

### Global Styles
```css
/* src/renderer/styles/global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

/* Electron drag regions */
.drag-region {
  -webkit-app-region: drag;
}

.no-drag {
  -webkit-app-region: no-drag;
}
```

---

## 6.9 Deliverables

After Phase 6 completion:
- [ ] Dashboard opens from tray
- [ ] Gallery displays all captures
- [ ] Thumbnails load correctly
- [ ] Search by filename works
- [ ] Filter by type works
- [ ] Filter by date range works
- [ ] Tag filtering works
- [ ] Add/remove tags works
- [ ] Create new tags works
- [ ] Detail modal opens on click
- [ ] Open file works
- [ ] Show in folder works
- [ ] Delete removes file and updates gallery

---

## 6.10 Verification

```bash
# Test scenarios:
# 1. Open dashboard → gallery shows captures
# 2. Search "test" → filters results
# 3. Filter to "Screenshots only"
# 4. Filter to "Today" → shows today's captures
# 5. Add tag to capture
# 6. Filter by tag → shows tagged captures
# 7. Click thumbnail → detail modal opens
# 8. Play video in detail view
# 9. Delete from detail view → removed from gallery
# 10. Responsive: resize window, grid adjusts
```
