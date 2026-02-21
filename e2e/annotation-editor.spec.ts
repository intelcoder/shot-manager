import { test, expect, _electron as electron } from '@playwright/test';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
// sql.js is a prod dependency, available at test time
// eslint-disable-next-line @typescript-eslint/no-require-imports
const initSqlJs = require('sql.js');

// Build the app before running tests
test.beforeAll(() => {
  console.log('Building app...');
  execSync('npm run build', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
  });
});

test.describe('Annotation Editor', () => {
  let electronApp: Awaited<ReturnType<typeof electron.launch>>;
  let testImagePath: string;
  let tmpAppData: string;

  test.beforeEach(async () => {
    // Use an isolated APPDATA directory so we don't pollute the real database
    tmpAppData = fs.mkdtempSync(path.join(os.tmpdir(), 'shot-manager-e2e-'));

    // Create a small test PNG file
    testImagePath = path.join(tmpAppData, 'test-capture.png');

    // Minimal 1x1 white PNG (base64)
    const minimalPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(testImagePath, minimalPng);

    // Pre-seed database using sql.js directly in Node context (before launching Electron)
    // Electron on Windows stores userData at %APPDATA%\{appName}
    // By overriding APPDATA we control where the DB lives
    const appDataDir = path.join(tmpAppData, 'shot-manager');
    fs.mkdirSync(appDataDir, { recursive: true });
    const dbPath = path.join(appDataDir, 'shot-manager.db');

    const SQL = await initSqlJs();
    const db = new SQL.Database();

    // Create the captures table matching the app schema
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
        is_starred INTEGER DEFAULT 0,
        annotations TEXT,
        folder_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS capture_tags (
        capture_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (capture_id, tag_id)
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Mark migrations as already applied so initDatabase() doesn't re-run them
    db.run("INSERT INTO migrations (name) VALUES ('001_add_folders')");
    db.run("INSERT INTO migrations (name) VALUES ('002_add_starred_and_cleanup')");

    // Create folders table (required by migration checks)
    db.run(`
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER,
        color TEXT,
        icon TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    // Insert a test screenshot record
    db.run(
      `INSERT INTO captures (type, filename, filepath, width, height, size, created_at)
       VALUES ('screenshot', 'test-capture.png', ?, 100, 100, 1024, datetime('now'))`,
      [testImagePath]
    );

    // Write the database to disk
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    db.close();

    // Launch the Electron app with an isolated user-data-dir
    // --user-data-dir overrides app.getPath('userData') directly
    electronApp = await electron.launch({
      args: [
        path.resolve(__dirname, '../dist/main/index.js'),
        `--user-data-dir=${appDataDir}`,
      ],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });
  });

  test.afterEach(async () => {
    await electronApp.close();
    // Clean up temp directory
    fs.rmSync(tmpAppData, { recursive: true, force: true });
  });

  test('opens annotation editor from gallery hover button', async () => {
    // Get the main window
    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // Wait for gallery to show the test capture
    // GalleryItem root div has class "group"
    const galleryItem = window.locator('.group').first();
    await expect(galleryItem).toBeVisible({ timeout: 10000 });

    // Hover to reveal action buttons
    await galleryItem.hover();

    // Click the annotate (pencil) button — title="Annotate"
    const annotateBtn = window.locator('button[title="Annotate"]').first();
    await expect(annotateBtn).toBeVisible({ timeout: 5000 });
    await annotateBtn.click();

    // Verify annotation editor toolbar is visible
    // Toolbar shows "Annotate: {filename}"
    await expect(window.locator('text=Annotate:')).toBeVisible({ timeout: 5000 });
    // Tool buttons with their titles as defined in AnnotationEditor.tsx
    await expect(window.locator('button[title="Arrow"]')).toBeVisible();
    await expect(window.locator('button[title="Text"]')).toBeVisible();
    // Rectangle tool has label "Highlight"
    await expect(window.locator('button[title="Highlight"]')).toBeVisible();
    await expect(window.locator('button', { hasText: 'Save' })).toBeVisible();
    await expect(window.locator('button', { hasText: 'Cancel' })).toBeVisible();
  });

  test('cancel returns to gallery without saving', async () => {
    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // Open editor
    const galleryItem = window.locator('.group').first();
    await expect(galleryItem).toBeVisible({ timeout: 10000 });
    await galleryItem.hover();
    await window.locator('button[title="Annotate"]').first().click();
    await expect(window.locator('button', { hasText: 'Cancel' })).toBeVisible({ timeout: 5000 });

    // Click Cancel
    await window.locator('button', { hasText: 'Cancel' }).click();

    // Gallery should be back (group class items visible)
    await expect(window.locator('.group').first()).toBeVisible({ timeout: 5000 });
    // Editor toolbar should be gone — Arrow button should not be present
    await expect(window.locator('button[title="Arrow"]')).not.toBeVisible();
  });

  test('tool buttons are selectable', async () => {
    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    const galleryItem = window.locator('.group').first();
    await expect(galleryItem).toBeVisible({ timeout: 10000 });
    await galleryItem.hover();
    await window.locator('button[title="Annotate"]').first().click();
    await expect(window.locator('button[title="Arrow"]')).toBeVisible({ timeout: 5000 });

    // Click Arrow tool — should become active (has bg-primary-500 class)
    const arrowBtn = window.locator('button[title="Arrow"]');
    await arrowBtn.click();
    await expect(arrowBtn).toHaveClass(/bg-primary-500/);

    // Click Text tool
    const textBtn = window.locator('button[title="Text"]');
    await textBtn.click();
    await expect(textBtn).toHaveClass(/bg-primary-500/);
    // Arrow should no longer be active
    await expect(arrowBtn).not.toHaveClass(/bg-primary-500/);
  });
});
