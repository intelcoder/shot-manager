import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import type { CaptureRecord, CaptureFile, Tag } from '../../shared/types/capture';

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
