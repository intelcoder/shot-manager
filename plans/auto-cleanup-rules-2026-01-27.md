# Auto-Cleanup Rules Feature Plan

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Star Feature (Foundation) | ✅ Complete |
| Phase 2 | Cleanup Rules Data Layer | ✅ Complete |
| Phase 3 | Cleanup Settings UI | ✅ Complete |
| Phase 4 | Cleanup Execution | ✅ Complete |
| Phase 5 | Scheduler | ✅ Complete |

**All phases implemented.** Auto-cleanup rules with star protection, scheduling, and preview functionality are fully functional.

---

## Overview
Configurable auto-cleanup rules that automatically delete captures based on conditions (age, star status, tag status). Example rule: "Delete untagged/unstarred captures older than 14 days".

## Design Decisions
- **Rule system**: Multiple custom rules (users can create rules with different conditions)
- **Star feature**: Star icon on each capture (visible on hover, batch support via toolbar)
- **Scheduling**: Manual + Scheduled (run manually anytime, plus optional daily/weekly auto-run)

---

## Phase 1: Star Feature (Foundation)

### Database Migration (002_add_starred_and_cleanup)
```sql
ALTER TABLE captures ADD COLUMN is_starred INTEGER DEFAULT 0;
CREATE INDEX idx_captures_starred ON captures(is_starred);
```

### Files Modified
- `src/main/services/database.ts` - Migration, `toggleCaptureStar()` function
- `src/shared/types/capture.ts` - Added `is_starred: boolean` to CaptureRecord
- `src/shared/constants/channels.ts` - Added `CAPTURE_TOGGLE_STAR` channel
- `src/preload/index.ts` - Exposed `toggleCaptureStar` API
- `src/main/ipc/handlers.ts` - Added star toggle handler
- `src/renderer/stores/captures-store.ts` - Added `toggleStar()` action
- `src/renderer/components/dashboard/GalleryItem.tsx` - Added star icon (top-left)
- `src/renderer/components/dashboard/SelectionToolbar.tsx` - Added batch star button

---

## Phase 2: Cleanup Rules Data Layer

### New Type: `src/shared/types/cleanup.ts`
```typescript
export interface CleanupRule {
  id: number;
  name: string;
  enabled: boolean;
  olderThanDays: number;
  includeStarred: boolean;   // false = protect starred items
  includeTagged: boolean;    // false = only delete untagged
  captureTypes: 'all' | 'screenshot' | 'video';
  scheduleType: 'manual' | 'daily' | 'weekly';
  scheduleHour: number;
  lastRunAt: string | null;
  lastRunCount: number;
}
```

### Database Tables
```sql
CREATE TABLE cleanup_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  older_than_days INTEGER NOT NULL,
  include_starred INTEGER DEFAULT 0,
  include_tagged INTEGER DEFAULT 1,
  capture_types TEXT DEFAULT 'all',
  schedule_type TEXT DEFAULT 'manual',
  schedule_hour INTEGER DEFAULT 3,
  last_run_at TEXT,
  last_run_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cleanup_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id INTEGER,
  rule_name TEXT NOT NULL,
  deleted_count INTEGER NOT NULL,
  freed_bytes INTEGER NOT NULL,
  executed_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### IPC Channels Added
```typescript
CLEANUP_RULE_CREATE, CLEANUP_RULE_UPDATE, CLEANUP_RULE_DELETE,
CLEANUP_RULE_LIST, CLEANUP_PREVIEW, CLEANUP_EXECUTE, CLEANUP_HISTORY
```

---

## Phase 3: Cleanup Settings UI

### New Components
```
src/renderer/components/settings/
├── CleanupSettings.tsx      # Main settings tab
├── CleanupRuleEditor.tsx    # Modal for create/edit rule
├── CleanupPreviewModal.tsx  # Shows what will be deleted
└── CleanupRuleItem.tsx      # Single rule row
```

### UI Features
- Rule list with enable/disable toggles
- Preview button to see what will be deleted
- Run Now button for manual execution
- Cleanup history display
- Rule editor with all configuration options

---

## Phase 4: Cleanup Execution

### New Service: `src/main/services/cleanup.ts`
- `previewCleanup(ruleId)` - Query matching captures, return preview
- `executeCleanup(ruleId)` - Delete files + records, log history

### Query Logic
```sql
SELECT c.* FROM captures c
LEFT JOIN capture_tags ct ON c.id = ct.capture_id
WHERE c.created_at < datetime('now', '-{olderThanDays} days')
  AND ({includeStarred} = 1 OR c.is_starred = 0)
  AND ({includeTagged} = 1 OR ct.capture_id IS NULL)
  AND ({captureTypes} = 'all' OR c.type = {captureTypes})
GROUP BY c.id
```

---

## Phase 5: Scheduler

### New Service: `src/main/services/cleanup-scheduler.ts`
```typescript
const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

export function initScheduler() {
  setInterval(checkScheduledRules, CHECK_INTERVAL);
  checkScheduledRules(); // Run on startup
}
```

Initialized in `src/main/index.ts` after app ready.

---

## Files Summary

### New Files (6)
1. `src/shared/types/cleanup.ts`
2. `src/main/services/cleanup.ts`
3. `src/main/services/cleanup-scheduler.ts`
4. `src/renderer/stores/cleanup-store.ts`
5. `src/renderer/components/settings/CleanupSettings.tsx`
6. `src/renderer/components/settings/CleanupRuleEditor.tsx`
7. `src/renderer/components/settings/CleanupPreviewModal.tsx`
8. `src/renderer/components/settings/CleanupRuleItem.tsx`

### Modified Files (8)
1. `src/main/services/database.ts` - Migration, star toggle, rule CRUD
2. `src/shared/types/capture.ts` - Added `is_starred` field
3. `src/shared/constants/channels.ts` - Added cleanup IPC channels
4. `src/preload/index.ts` - Exposed cleanup APIs
5. `src/main/ipc/handlers.ts` - Added cleanup handlers
6. `src/main/index.ts` - Initialize cleanup scheduler
7. `src/renderer/components/settings/SettingsPanel.tsx` - Added "Auto-Cleanup" tab
8. `src/renderer/components/dashboard/GalleryItem.tsx` - Added star icon
9. `src/renderer/components/dashboard/SelectionToolbar.tsx` - Added batch star button

---

## Verification

1. **Star feature**: Click star icon on capture, verify persists after refresh
2. **Rule creation**: Create rule, verify saved in database
3. **Preview**: Click preview, verify correct captures shown
4. **Manual execution**: Run cleanup, verify files deleted from disk + database
5. **Scheduler**: Set daily rule, advance system clock, verify auto-execution
6. **History**: Check cleanup history shows all executions
