import { shell, nativeImage, clipboard, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { format as formatDate } from 'date-fns';
import { getSetting } from './settings';
import { insertCapture, deleteCapture as dbDeleteCapture, getCaptureById, updateCaptureFilename } from './database';
import type { CaptureType, CaptureResult } from '../../shared/types/capture';

export interface SaveOptions {
  type: CaptureType;
  width?: number;
  height?: number;
  duration?: number;
}

export async function saveScreenshot(image: Electron.NativeImage): Promise<CaptureResult> {
  let savePath = getSetting('savePath');
  const prefix = getSetting('filePrefix') || 'Screenshot';
  const format = getSetting('screenshotFormat') || 'png';
  const style = getSetting('organizationStyle') || 'date';
  const copyToClipboard = getSetting('copyToClipboard');

  // Ensure savePath is valid, use default if empty
  if (!savePath) {
    const { app } = require('electron');
    savePath = path.join(app.getPath('pictures'), 'Shot Manager');
    console.log('[FileManager] savePath was empty, using default:', savePath);
  }

  console.log('[FileManager] Settings:', { savePath, prefix, format, style, copyToClipboard });

  const now = new Date();
  console.log('[FileManager] Creating folder structure...');
  const folder = ensureSaveFolder(savePath, now, style);
  console.log('[FileManager] Folder:', folder);
  const baseFilename = generateFilename(prefix, now, 'screenshot', format);
  const filename = getUniqueFilename(folder, baseFilename);
  const filepath = path.join(folder, filename);
  console.log('[FileManager] Will save to:', filepath);

  // Convert and save
  let buffer: Buffer;
  if (format === 'jpg') {
    buffer = image.toJPEG(90);
  } else {
    buffer = image.toPNG();
  }

  await fs.promises.writeFile(filepath, buffer);
  console.log('[FileManager] File written successfully, size:', buffer.length, 'bytes');

  // Copy to clipboard if enabled
  if (copyToClipboard) {
    clipboard.writeImage(image);
  }

  // Get file stats
  const stats = await fs.promises.stat(filepath);
  const size = image.getSize();

  // Insert to database
  const id = insertCapture({
    type: 'screenshot',
    filename,
    filepath,
    width: size.width,
    height: size.height,
    duration: null,
    size: stats.size,
    thumbnail_path: null,
  });

  return {
    id,
    type: 'screenshot',
    filepath,
    filename,
    width: size.width,
    height: size.height,
    size: stats.size,
    createdAt: now,
  };
}

export async function saveVideo(buffer: Buffer, duration: number, width: number, height: number): Promise<CaptureResult> {
  const savePath = getSetting('savePath');
  const prefix = getSetting('filePrefix');
  const videoFormat = getSetting('videoFormat');
  const style = getSetting('organizationStyle');

  const now = new Date();
  const folder = ensureSaveFolder(savePath, now, style);
  const baseFilename = generateFilename(prefix, now, 'video', videoFormat);
  const filename = getUniqueFilename(folder, baseFilename);
  const filepath = path.join(folder, filename);

  await fs.promises.writeFile(filepath, buffer);

  const stats = await fs.promises.stat(filepath);

  // Insert to database
  const id = insertCapture({
    type: 'video',
    filename,
    filepath,
    width,
    height,
    duration,
    size: stats.size,
    thumbnail_path: null,
  });

  return {
    id,
    type: 'video',
    filepath,
    filename,
    width,
    height,
    size: stats.size,
    duration,
    createdAt: now,
  };
}

export function copyImageToClipboard(imagePath: string): void {
  const image = nativeImage.createFromPath(imagePath);
  clipboard.writeImage(image);
}

export async function openFile(filepath: string): Promise<void> {
  await shell.openPath(filepath);
}

export function showInFolder(filepath: string): void {
  shell.showItemInFolder(filepath);
}

export async function deleteFile(id: number): Promise<void> {
  const capture = getCaptureById(id);
  if (!capture) return;

  // Delete file from disk
  if (fs.existsSync(capture.filepath)) {
    await fs.promises.unlink(capture.filepath);
  }

  // Delete thumbnail if exists
  if (capture.thumbnail_path && fs.existsSync(capture.thumbnail_path)) {
    await fs.promises.unlink(capture.thumbnail_path);
  }

  // Delete from database
  dbDeleteCapture(id);
}

export async function renameFile(id: number, newFilename: string): Promise<{ success: boolean; error?: string; capture?: any }> {
  const capture = getCaptureById(id);
  if (!capture) {
    return { success: false, error: 'File not found' };
  }

  // Validate filename
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/g;
  if (invalidChars.test(newFilename)) {
    return { success: false, error: 'Filename contains invalid characters' };
  }

  if (!newFilename.trim()) {
    return { success: false, error: 'Filename cannot be empty' };
  }

  // Preserve the original extension
  const originalExt = path.extname(capture.filename);
  const newNameWithoutExt = path.basename(newFilename, path.extname(newFilename));
  const finalFilename = newNameWithoutExt + originalExt;

  // Build new filepath
  const dir = path.dirname(capture.filepath);
  const newFilepath = path.join(dir, finalFilename);

  // Check if file already exists
  if (capture.filepath !== newFilepath && fs.existsSync(newFilepath)) {
    return { success: false, error: 'A file with this name already exists' };
  }

  try {
    // Rename file on disk
    if (fs.existsSync(capture.filepath)) {
      await fs.promises.rename(capture.filepath, newFilepath);
    }

    // Update database
    updateCaptureFilename(id, finalFilename, newFilepath);

    // Return updated capture
    const updatedCapture = getCaptureById(id);
    return { success: true, capture: updatedCapture };
  } catch (error) {
    console.error('[FileManager] Failed to rename file:', error);
    return { success: false, error: 'Failed to rename file' };
  }
}

export async function selectSavePath(): Promise<{ success: boolean; path?: string; error?: string }> {
  const currentPath = getSetting('savePath');

  const result = await dialog.showOpenDialog({
    title: 'Select Save Location',
    defaultPath: currentPath,
    properties: ['openDirectory', 'createDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, error: 'cancelled' };
  }

  const selectedPath = result.filePaths[0];

  // Validate path is writable
  if (await validateSavePath(selectedPath)) {
    return { success: true, path: selectedPath };
  }

  return { success: false, error: 'not_writable' };
}

async function validateSavePath(testPath: string): Promise<boolean> {
  try {
    const testFile = path.join(testPath, '.shot-manager-test');
    await fs.promises.writeFile(testFile, '');
    await fs.promises.unlink(testFile);
    return true;
  } catch {
    return false;
  }
}

function ensureSaveFolder(basePath: string, date: Date, style: 'date' | 'flat'): string {
  let targetPath: string;

  if (style === 'date') {
    const year = formatDate(date, 'yyyy');
    const month = formatDate(date, 'MM');
    const day = formatDate(date, 'dd');
    targetPath = path.join(basePath, year, month, day);
  } else {
    targetPath = basePath;
  }

  console.log('[FileManager] Ensuring folder exists:', targetPath);

  try {
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
      console.log('[FileManager] Created folder:', targetPath);
    } else {
      console.log('[FileManager] Folder already exists');
    }
  } catch (error) {
    console.error('[FileManager] Failed to create folder:', error);
    throw error;
  }

  return targetPath;
}

function generateFilename(prefix: string, timestamp: Date, type: CaptureType, ext: string): string {
  const ts = formatDate(timestamp, 'yyyy-MM-dd_HH-mm-ss');
  return `${prefix}_${ts}.${ext}`;
}

function getUniqueFilename(folder: string, baseFilename: string): string {
  let filename = baseFilename;
  let counter = 0;

  while (fs.existsSync(path.join(folder, filename))) {
    counter++;
    const ext = path.extname(baseFilename);
    const name = path.basename(baseFilename, ext);
    filename = `${name}_${counter}${ext}`;
  }

  return filename;
}
