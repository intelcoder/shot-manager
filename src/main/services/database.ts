import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import type { CaptureRecord, CaptureFile, Tag } from '../../shared/types/capture';
import type { Folder, FolderTree, CreateFolderInput, UpdateFolderInput } from '../../shared/types/folder';

let db: SqlJsDatabase | null = null;
let dbPath: string = '';

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData');
  dbPath = path.join(userDataPath, 'shot-manager.db');

  // Ensure directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  // Initialize sql.js
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS captures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('screenshot', 'video')),
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      duration INTEGER,
      size INTEGER,
      thumbnail_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS capture_tags (
      capture_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (capture_id, tag_id),
      FOREIGN KEY (capture_id) REFERENCES captures(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_captures_created_at ON captures(created_at);
    CREATE INDEX IF NOT EXISTS idx_captures_type ON captures(type);
  `);

  // Run migrations
  runMigrations();

  saveDatabase();
}

export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function saveDatabase(): void {
  if (!db || !dbPath) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

// Capture operations
export function insertCapture(capture: Omit<CaptureRecord, 'id' | 'created_at'>): number {
  const db = getDatabase();
  db.run(
    `INSERT INTO captures (type, filename, filepath, width, height, duration, size, thumbnail_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      capture.type,
      capture.filename,
      capture.filepath,
      capture.width ?? null,
      capture.height ?? null,
      capture.duration ?? null,
      capture.size ?? null,
      capture.thumbnail_path ?? null,
    ]
  );

  const result = db.exec('SELECT last_insert_rowid() as id');
  saveDatabase();
  return result[0].values[0][0] as number;
}

export function getCaptures(options?: {
  type?: 'screenshot' | 'video' | 'all';
  dateRange?: 'today' | 'week' | 'month' | 'all';
  startDate?: string;
  endDate?: string;
  tags?: number[];
  search?: string;
  folderId?: number | null | 'uncategorized';
  limit?: number;
  offset?: number;
}): CaptureFile[] {
  const db = getDatabase();

  let query = `
    SELECT c.*, GROUP_CONCAT(t.id || ':' || t.name || ':' || COALESCE(t.color, '')) as tag_data
    FROM captures c
    LEFT JOIN capture_tags ct ON c.id = ct.capture_id
    LEFT JOIN tags t ON ct.tag_id = t.id
    WHERE 1=1
  `;

  const params: any[] = [];

  if (options?.type && options.type !== 'all') {
    query += ' AND c.type = ?';
    params.push(options.type);
  }

  if (options?.dateRange && options.dateRange !== 'all') {
    const now = new Date();
    let startDate: Date;

    switch (options.dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0);
    }

    query += ' AND c.created_at >= ?';
    params.push(startDate.toISOString());
  }

  if (options?.startDate) {
    query += ' AND c.created_at >= ?';
    params.push(options.startDate);
  }

  if (options?.endDate) {
    query += ' AND c.created_at <= ?';
    params.push(options.endDate);
  }

  if (options?.search) {
    query += ' AND c.filename LIKE ?';
    params.push(`%${options.search}%`);
  }

  if (options?.folderId !== undefined) {
    if (options.folderId === 'uncategorized' || options.folderId === null) {
      query += ' AND c.folder_id IS NULL';
    } else {
      query += ' AND c.folder_id = ?';
      params.push(options.folderId);
    }
  }

  if (options?.tags && options.tags.length > 0) {
    query += ` AND c.id IN (
      SELECT capture_id FROM capture_tags WHERE tag_id IN (${options.tags.map(() => '?').join(',')})
    )`;
    params.push(...options.tags);
  }

  query += ' GROUP BY c.id ORDER BY c.created_at DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  if (options?.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }

  const results = db.exec(query, params);
  if (results.length === 0) return [];

  const columns = results[0].columns;
  const rows = results[0].values;

  return rows.map((row) => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return {
      ...obj,
      folderId: obj.folder_id,
      isStarred: obj.is_starred === 1,
      is_starred: obj.is_starred === 1,
      tags: parseTagData(obj.tag_data),
    };
  });
}

export function getCaptureById(id: number): CaptureFile | null {
  const db = getDatabase();
  const results = db.exec(
    `SELECT c.*, GROUP_CONCAT(t.id || ':' || t.name || ':' || COALESCE(t.color, '')) as tag_data
     FROM captures c
     LEFT JOIN capture_tags ct ON c.id = ct.capture_id
     LEFT JOIN tags t ON ct.tag_id = t.id
     WHERE c.id = ?
     GROUP BY c.id`,
    [id]
  );

  if (results.length === 0 || results[0].values.length === 0) return null;

  const columns = results[0].columns;
  const row = results[0].values[0];
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });

  return {
    ...obj,
    folderId: obj.folder_id,
    isStarred: obj.is_starred === 1,
    is_starred: obj.is_starred === 1,
    tags: parseTagData(obj.tag_data),
  };
}

export function deleteCapture(id: number): void {
  const db = getDatabase();
  db.run('DELETE FROM capture_tags WHERE capture_id = ?', [id]);
  db.run('DELETE FROM captures WHERE id = ?', [id]);
  saveDatabase();
}

export function updateCaptureFilename(id: number, newFilename: string, newFilepath: string): void {
  const db = getDatabase();
  db.run('UPDATE captures SET filename = ?, filepath = ? WHERE id = ?', [newFilename, newFilepath, id]);
  saveDatabase();
}

// Tag operations
export function getAllTags(): Tag[] {
  const db = getDatabase();
  const results = db.exec('SELECT * FROM tags ORDER BY name');
  if (results.length === 0) return [];

  const columns = results[0].columns;
  const rows = results[0].values;

  return rows.map((row) => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as Tag;
  });
}

export function createTag(name: string, color?: string): Tag {
  const db = getDatabase();
  db.run('INSERT INTO tags (name, color) VALUES (?, ?)', [name, color ?? null]);
  const result = db.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0] as number;
  saveDatabase();
  return { id, name, color };
}

export function deleteTag(id: number): void {
  const db = getDatabase();
  db.run('DELETE FROM capture_tags WHERE tag_id = ?', [id]);
  db.run('DELETE FROM tags WHERE id = ?', [id]);
  saveDatabase();
}

export function addTagToCapture(captureId: number, tagId: number): void {
  const db = getDatabase();
  db.run('INSERT OR IGNORE INTO capture_tags (capture_id, tag_id) VALUES (?, ?)', [captureId, tagId]);
  saveDatabase();
}

export function removeTagFromCapture(captureId: number, tagId: number): void {
  const db = getDatabase();
  db.run('DELETE FROM capture_tags WHERE capture_id = ? AND tag_id = ?', [captureId, tagId]);
  saveDatabase();
}

function parseTagData(tagData: string | null): Tag[] {
  if (!tagData) return [];

  return tagData
    .split(',')
    .filter(Boolean)
    .map((item) => {
      const [id, name, color] = item.split(':');
      return {
        id: parseInt(id, 10),
        name,
        color: color || undefined,
      };
    });
}

// Migration system
function runMigrations(): void {
  const db = getDatabase();

  // Create migrations table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Check which migrations have been applied
  const appliedMigrations = new Set<string>();
  const results = db.exec('SELECT name FROM migrations');
  if (results.length > 0) {
    results[0].values.forEach((row) => {
      appliedMigrations.add(row[0] as string);
    });
  }

  // Migration: Add starred column to captures
  if (!appliedMigrations.has('002_add_starred_and_cleanup')) {
    try {
      db.run('BEGIN TRANSACTION');

      // Check if is_starred column exists on captures
      const tableInfo = db.exec("PRAGMA table_info(captures)");
      const columns = tableInfo.length > 0 ? tableInfo[0].values.map(row => row[1]) : [];

      if (!columns.includes('is_starred')) {
        db.run('ALTER TABLE captures ADD COLUMN is_starred INTEGER DEFAULT 0;');
        db.run('CREATE INDEX IF NOT EXISTS idx_captures_starred ON captures(is_starred);');
      }

      // Create cleanup_rules table
      db.run(`
        CREATE TABLE IF NOT EXISTS cleanup_rules (
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
      `);

      // Create cleanup_history table
      db.run(`
        CREATE TABLE IF NOT EXISTS cleanup_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rule_id INTEGER,
          rule_name TEXT NOT NULL,
          deleted_count INTEGER NOT NULL,
          freed_bytes INTEGER NOT NULL,
          executed_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Record migration
      db.run("INSERT INTO migrations (name) VALUES ('002_add_starred_and_cleanup')");

      db.run('COMMIT');
      console.log('[Database] Migration 002_add_starred_and_cleanup applied successfully');
    } catch (error) {
      db.run('ROLLBACK');
      console.error('[Database] Migration 002_add_starred_and_cleanup failed:', error);
      throw error;
    }
  }

  // Migration: Add folders table and folder_id to captures
  if (!appliedMigrations.has('001_add_folders')) {
    try {
      db.run('BEGIN TRANSACTION');

      // Create folders table
      db.run(`
        CREATE TABLE IF NOT EXISTS folders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
          color TEXT,
          icon TEXT,
          sort_order INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      db.run('CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);');

      // Check if folder_id column exists on captures
      const tableInfo = db.exec("PRAGMA table_info(captures)");
      const columns = tableInfo.length > 0 ? tableInfo[0].values.map(row => row[1]) : [];

      if (!columns.includes('folder_id')) {
        db.run('ALTER TABLE captures ADD COLUMN folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL;');
        db.run('CREATE INDEX IF NOT EXISTS idx_captures_folder_id ON captures(folder_id);');
      }

      // Record migration
      db.run("INSERT INTO migrations (name) VALUES ('001_add_folders')");

      db.run('COMMIT');
      console.log('[Database] Migration 001_add_folders applied successfully');
    } catch (error) {
      db.run('ROLLBACK');
      console.error('[Database] Migration 001_add_folders failed:', error);
      throw error;
    }
  }
}

// Folder operations
export function createFolder(input: CreateFolderInput): Folder {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO folders (name, parent_id, color, icon, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.parentId ?? null,
      input.color ?? null,
      input.icon ?? null,
      0,
      now,
      now,
    ]
  );

  const result = db.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0] as number;
  saveDatabase();

  return {
    id,
    name: input.name,
    parentId: input.parentId ?? null,
    color: input.color ?? null,
    icon: input.icon ?? null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function getAllFolders(): Folder[] {
  const db = getDatabase();
  const results = db.exec('SELECT * FROM folders ORDER BY sort_order, name');
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
      parentId: obj.parent_id,
      color: obj.color,
      icon: obj.icon,
      sortOrder: obj.sort_order,
      createdAt: obj.created_at,
      updatedAt: obj.updated_at,
    } as Folder;
  });
}

export function getFolderTree(): FolderTree[] {
  const db = getDatabase();

  // Get all folders with capture counts
  const results = db.exec(`
    SELECT f.*, COUNT(c.id) as capture_count
    FROM folders f
    LEFT JOIN captures c ON c.folder_id = f.id
    GROUP BY f.id
    ORDER BY f.sort_order, f.name
  `);

  if (results.length === 0) return [];

  const columns = results[0].columns;
  const rows = results[0].values;

  const folders: (FolderTree & { parentId: number | null })[] = rows.map((row) => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return {
      id: obj.id,
      name: obj.name,
      parentId: obj.parent_id,
      color: obj.color,
      icon: obj.icon,
      sortOrder: obj.sort_order,
      createdAt: obj.created_at,
      updatedAt: obj.updated_at,
      children: [],
      captureCount: obj.capture_count,
    };
  });

  // Build tree structure
  const folderMap = new Map<number, FolderTree>();
  folders.forEach((folder) => folderMap.set(folder.id, folder));

  const rootFolders: FolderTree[] = [];

  folders.forEach((folder) => {
    if (folder.parentId === null) {
      rootFolders.push(folder);
    } else {
      const parent = folderMap.get(folder.parentId);
      if (parent) {
        parent.children.push(folder);
      } else {
        // Parent not found, treat as root
        rootFolders.push(folder);
      }
    }
  });

  return rootFolders;
}

export function updateFolder(id: number, input: UpdateFolderInput): Folder | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  const updates: string[] = [];
  const params: any[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    params.push(input.name);
  }
  if (input.parentId !== undefined) {
    updates.push('parent_id = ?');
    params.push(input.parentId);
  }
  if (input.color !== undefined) {
    updates.push('color = ?');
    params.push(input.color);
  }
  if (input.icon !== undefined) {
    updates.push('icon = ?');
    params.push(input.icon);
  }
  if (input.sortOrder !== undefined) {
    updates.push('sort_order = ?');
    params.push(input.sortOrder);
  }

  if (updates.length === 0) return null;

  updates.push('updated_at = ?');
  params.push(now);
  params.push(id);

  db.run(`UPDATE folders SET ${updates.join(', ')} WHERE id = ?`, params);
  saveDatabase();

  // Fetch and return updated folder
  const results = db.exec('SELECT * FROM folders WHERE id = ?', [id]);
  if (results.length === 0 || results[0].values.length === 0) return null;

  const columns = results[0].columns;
  const row = results[0].values[0];
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });

  return {
    id: obj.id,
    name: obj.name,
    parentId: obj.parent_id,
    color: obj.color,
    icon: obj.icon,
    sortOrder: obj.sort_order,
    createdAt: obj.created_at,
    updatedAt: obj.updated_at,
  };
}

export function deleteFolder(id: number): void {
  const db = getDatabase();
  db.run('DELETE FROM folders WHERE id = ?', [id]);
  saveDatabase();
}

// Batch operations
export function moveCapturesTo(captureIds: number[], folderId: number | null): void {
  const db = getDatabase();
  const placeholders = captureIds.map(() => '?').join(',');
  db.run(
    `UPDATE captures SET folder_id = ? WHERE id IN (${placeholders})`,
    [folderId, ...captureIds]
  );
  saveDatabase();
}

export function deleteCapturesBatch(captureIds: number[]): void {
  const db = getDatabase();
  const placeholders = captureIds.map(() => '?').join(',');
  db.run(`DELETE FROM capture_tags WHERE capture_id IN (${placeholders})`, captureIds);
  db.run(`DELETE FROM captures WHERE id IN (${placeholders})`, captureIds);
  saveDatabase();
}

export function addTagToCapturesBatch(captureIds: number[], tagId: number): void {
  const db = getDatabase();
  captureIds.forEach((captureId) => {
    db.run('INSERT OR IGNORE INTO capture_tags (capture_id, tag_id) VALUES (?, ?)', [captureId, tagId]);
  });
  saveDatabase();
}

export function removeTagFromCapturesBatch(captureIds: number[], tagId: number): void {
  const db = getDatabase();
  const placeholders = captureIds.map(() => '?').join(',');
  db.run(
    `DELETE FROM capture_tags WHERE capture_id IN (${placeholders}) AND tag_id = ?`,
    [...captureIds, tagId]
  );
  saveDatabase();
}

// Get counts for virtual folders
export function getUncategorizedCount(): number {
  const db = getDatabase();
  const results = db.exec('SELECT COUNT(*) as count FROM captures WHERE folder_id IS NULL');
  if (results.length === 0) return 0;
  return results[0].values[0][0] as number;
}

export function getTotalCaptureCount(): number {
  const db = getDatabase();
  const results = db.exec('SELECT COUNT(*) as count FROM captures');
  if (results.length === 0) return 0;
  return results[0].values[0][0] as number;
}

// Star operations
export function toggleCaptureStar(captureId: number): boolean {
  const db = getDatabase();
  db.run('UPDATE captures SET is_starred = CASE WHEN is_starred = 1 THEN 0 ELSE 1 END WHERE id = ?', [captureId]);
  saveDatabase();

  // Return new starred state
  const results = db.exec('SELECT is_starred FROM captures WHERE id = ?', [captureId]);
  if (results.length === 0 || results[0].values.length === 0) return false;
  return results[0].values[0][0] === 1;
}

export function toggleCapturesBatchStar(captureIds: number[], starred: boolean): void {
  const db = getDatabase();
  const placeholders = captureIds.map(() => '?').join(',');
  db.run(
    `UPDATE captures SET is_starred = ? WHERE id IN (${placeholders})`,
    [starred ? 1 : 0, ...captureIds]
  );
  saveDatabase();
}

// Cleanup rule operations
import type { CleanupRule, CreateCleanupRuleInput, UpdateCleanupRuleInput, CleanupHistoryEntry } from '../../shared/types/cleanup';

export function createCleanupRule(input: CreateCleanupRuleInput): CleanupRule {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO cleanup_rules (name, enabled, older_than_days, include_starred, include_tagged, capture_types, schedule_type, schedule_hour, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.enabled !== false ? 1 : 0,
      input.olderThanDays,
      input.includeStarred ? 1 : 0,
      input.includeTagged !== false ? 1 : 0,
      input.captureTypes ?? 'all',
      input.scheduleType ?? 'manual',
      input.scheduleHour ?? 3,
      now,
    ]
  );

  const result = db.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0] as number;
  saveDatabase();

  return getCleanupRuleById(id)!;
}

export function getCleanupRuleById(id: number): CleanupRule | null {
  const db = getDatabase();
  const results = db.exec('SELECT * FROM cleanup_rules WHERE id = ?', [id]);

  if (results.length === 0 || results[0].values.length === 0) return null;

  const columns = results[0].columns;
  const row = results[0].values[0];
  const obj: any = {};
  columns.forEach((col, i) => {
    obj[col] = row[i];
  });

  return mapCleanupRule(obj);
}

export function getAllCleanupRules(): CleanupRule[] {
  const db = getDatabase();
  const results = db.exec('SELECT * FROM cleanup_rules ORDER BY created_at DESC');

  if (results.length === 0) return [];

  const columns = results[0].columns;
  const rows = results[0].values;

  return rows.map((row) => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return mapCleanupRule(obj);
  });
}

export function updateCleanupRule(id: number, input: UpdateCleanupRuleInput): CleanupRule | null {
  const db = getDatabase();

  const updates: string[] = [];
  const params: any[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    params.push(input.name);
  }
  if (input.enabled !== undefined) {
    updates.push('enabled = ?');
    params.push(input.enabled ? 1 : 0);
  }
  if (input.olderThanDays !== undefined) {
    updates.push('older_than_days = ?');
    params.push(input.olderThanDays);
  }
  if (input.includeStarred !== undefined) {
    updates.push('include_starred = ?');
    params.push(input.includeStarred ? 1 : 0);
  }
  if (input.includeTagged !== undefined) {
    updates.push('include_tagged = ?');
    params.push(input.includeTagged ? 1 : 0);
  }
  if (input.captureTypes !== undefined) {
    updates.push('capture_types = ?');
    params.push(input.captureTypes);
  }
  if (input.scheduleType !== undefined) {
    updates.push('schedule_type = ?');
    params.push(input.scheduleType);
  }
  if (input.scheduleHour !== undefined) {
    updates.push('schedule_hour = ?');
    params.push(input.scheduleHour);
  }

  if (updates.length === 0) return getCleanupRuleById(id);

  params.push(id);
  db.run(`UPDATE cleanup_rules SET ${updates.join(', ')} WHERE id = ?`, params);
  saveDatabase();

  return getCleanupRuleById(id);
}

export function deleteCleanupRule(id: number): void {
  const db = getDatabase();
  db.run('DELETE FROM cleanup_rules WHERE id = ?', [id]);
  saveDatabase();
}

export function updateCleanupRuleLastRun(id: number, deletedCount: number): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.run(
    'UPDATE cleanup_rules SET last_run_at = ?, last_run_count = ? WHERE id = ?',
    [now, deletedCount, id]
  );
  saveDatabase();
}

export function addCleanupHistoryEntry(ruleId: number | null, ruleName: string, deletedCount: number, freedBytes: number): void {
  const db = getDatabase();
  db.run(
    `INSERT INTO cleanup_history (rule_id, rule_name, deleted_count, freed_bytes)
     VALUES (?, ?, ?, ?)`,
    [ruleId, ruleName, deletedCount, freedBytes]
  );
  saveDatabase();
}

export function getCleanupHistory(limit: number = 50): CleanupHistoryEntry[] {
  const db = getDatabase();
  const results = db.exec('SELECT * FROM cleanup_history ORDER BY executed_at DESC LIMIT ?', [limit]);

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
      ruleId: obj.rule_id,
      ruleName: obj.rule_name,
      deletedCount: obj.deleted_count,
      freedBytes: obj.freed_bytes,
      executedAt: obj.executed_at,
    };
  });
}

function mapCleanupRule(obj: any): CleanupRule {
  return {
    id: obj.id,
    name: obj.name,
    enabled: obj.enabled === 1,
    olderThanDays: obj.older_than_days,
    includeStarred: obj.include_starred === 1,
    includeTagged: obj.include_tagged === 1,
    captureTypes: obj.capture_types as 'all' | 'screenshot' | 'video',
    scheduleType: obj.schedule_type as 'manual' | 'daily' | 'weekly',
    scheduleHour: obj.schedule_hour,
    lastRunAt: obj.last_run_at,
    lastRunCount: obj.last_run_count ?? 0,
    createdAt: obj.created_at,
  };
}
