import fs from 'fs';
import {
  getDatabase,
  saveDatabase,
  getCleanupRuleById,
  updateCleanupRuleLastRun,
  addCleanupHistoryEntry,
  getCaptureById,
} from './database';
import type { CleanupPreview, CleanupResult } from '../../shared/types/cleanup';

/**
 * Preview which captures would be deleted by a cleanup rule
 */
export function previewCleanup(ruleId: number): CleanupPreview {
  const rule = getCleanupRuleById(ruleId);
  if (!rule) {
    return {
      ruleId,
      totalCount: 0,
      totalSizeBytes: 0,
      captures: [],
    };
  }

  const captures = getCapturesForCleanup(rule.olderThanDays, rule.includeStarred, rule.includeTagged, rule.captureTypes);

  return {
    ruleId,
    totalCount: captures.length,
    totalSizeBytes: captures.reduce((sum, c) => sum + (c.size || 0), 0),
    captures: captures.map((c) => ({
      id: c.id,
      filename: c.filename,
      size: c.size || 0,
      createdAt: c.created_at,
    })),
  };
}

/**
 * Execute a cleanup rule - delete matching captures from disk and database
 */
export async function executeCleanup(ruleId: number): Promise<CleanupResult> {
  const rule = getCleanupRuleById(ruleId);
  if (!rule) {
    return {
      success: false,
      deletedCount: 0,
      freedBytes: 0,
      errors: ['Rule not found'],
    };
  }

  const captures = getCapturesForCleanup(rule.olderThanDays, rule.includeStarred, rule.includeTagged, rule.captureTypes);

  let deletedCount = 0;
  let freedBytes = 0;
  const errors: string[] = [];

  const db = getDatabase();

  for (const capture of captures) {
    try {
      // Delete file from disk
      if (fs.existsSync(capture.filepath)) {
        await fs.promises.unlink(capture.filepath);
      }

      // Delete thumbnail if exists
      if (capture.thumbnail_path && fs.existsSync(capture.thumbnail_path)) {
        await fs.promises.unlink(capture.thumbnail_path);
      }

      // Delete from database
      db.run('DELETE FROM capture_tags WHERE capture_id = ?', [capture.id]);
      db.run('DELETE FROM captures WHERE id = ?', [capture.id]);

      deletedCount++;
      freedBytes += capture.size || 0;
    } catch (error) {
      errors.push(`Failed to delete ${capture.filename}: ${(error as Error).message}`);
    }
  }

  saveDatabase();

  // Update rule's last run info
  updateCleanupRuleLastRun(ruleId, deletedCount);

  // Add history entry
  addCleanupHistoryEntry(ruleId, rule.name, deletedCount, freedBytes);

  return {
    success: errors.length === 0,
    deletedCount,
    freedBytes,
    errors,
  };
}

/**
 * Get captures matching cleanup criteria
 */
function getCapturesForCleanup(
  olderThanDays: number,
  includeStarred: boolean,
  includeTagged: boolean,
  captureTypes: 'all' | 'screenshot' | 'video'
): Array<{ id: number; filename: string; filepath: string; thumbnail_path: string | null; size: number; created_at: string }> {
  const db = getDatabase();

  // Build the query based on rule conditions
  let query = `
    SELECT c.id, c.filename, c.filepath, c.thumbnail_path, c.size, c.created_at
    FROM captures c
    LEFT JOIN capture_tags ct ON c.id = ct.capture_id
    WHERE c.created_at < datetime('now', '-${olderThanDays} days')
  `;

  // Filter by starred status (if includeStarred is false, exclude starred items)
  if (!includeStarred) {
    query += ' AND (c.is_starred = 0 OR c.is_starred IS NULL)';
  }

  // Filter by capture type
  if (captureTypes !== 'all') {
    query += ` AND c.type = '${captureTypes}'`;
  }

  // Group by capture id and apply tagged filter
  if (!includeTagged) {
    // Only include captures that have NO tags
    query += ' GROUP BY c.id HAVING COUNT(ct.tag_id) = 0';
  } else {
    query += ' GROUP BY c.id';
  }

  const results = db.exec(query);
  if (results.length === 0) return [];

  const columns = results[0].columns;
  const rows = results[0].values;

  return rows.map((row) => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * Get all enabled scheduled rules that should run now
 */
export function getEnabledScheduledRules(): Array<{
  id: number;
  name: string;
  scheduleType: 'daily' | 'weekly';
  scheduleHour: number;
  lastRunAt: string | null;
}> {
  const db = getDatabase();
  const results = db.exec(`
    SELECT id, name, schedule_type, schedule_hour, last_run_at
    FROM cleanup_rules
    WHERE enabled = 1 AND schedule_type != 'manual'
  `);

  if (results.length === 0) return [];

  const columns = results[0].columns;
  const rows = results[0].values;

  return rows.map((row) => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return {
      id: obj.id,
      name: obj.name,
      scheduleType: obj.schedule_type as 'daily' | 'weekly',
      scheduleHour: obj.schedule_hour,
      lastRunAt: obj.last_run_at,
    };
  });
}
