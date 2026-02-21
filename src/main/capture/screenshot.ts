import { desktopCapturer, screen, nativeImage, BrowserWindow } from 'electron';
import { saveScreenshot } from '../services/file-manager';
import { getSetting } from '../services/settings';
import { showPreviewPopup } from '../windows/preview-window';
import { closeCaptureOverlay } from '../windows/capture-window';
import type { ScreenshotOptions, CaptureResult, SelectionArea } from '../../shared/types/capture';

export async function captureScreenshot(options: ScreenshotOptions): Promise<CaptureResult> {
  console.log('[Screenshot] Starting capture with options:', options);

  // Close capture overlay if open
  closeCaptureOverlay();

  // Wait for overlay to fully close before capturing
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Get the target display
  const display = options.displayId
    ? screen.getAllDisplays().find((d) => d.id === options.displayId)
    : screen.getPrimaryDisplay();

  if (!display) {
    throw new Error('Display not found');
  }

  // Capture the screen
  console.log('[Screenshot] Display:', display.id, display.size);
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: display.size.width * display.scaleFactor,
      height: display.size.height * display.scaleFactor,
    },
  });
  console.log('[Screenshot] Sources found:', sources.map(s => ({ id: s.id, name: s.name, display_id: s.display_id })));

  // Find matching source for display
  const source = sources.find((s) => {
    // On macOS, source.display_id matches display.id
    // On Windows, we may need to match by name or position
    if (s.display_id) {
      return s.display_id === display.id.toString();
    }
    // Fallback: use first screen source
    return s.name.toLowerCase().includes('screen') || s.name.toLowerCase().includes('display');
  });

  if (!source) {
    console.error('[Screenshot] No matching source found!');
    throw new Error('Screen source not found');
  }
  console.log('[Screenshot] Using source:', source.name);

  let image = source.thumbnail;
  console.log('[Screenshot] Thumbnail size:', image.getSize());

  // Crop if area selection
  if (options.mode === 'area' && options.area) {
    console.log('[Screenshot] Cropping to area:', options.area);
    image = cropImage(image, options.area, display.scaleFactor);
    const croppedSize = image.getSize();
    console.log('[Screenshot] Cropped size:', croppedSize);

    // Validate cropped image has valid dimensions
    if (croppedSize.width === 0 || croppedSize.height === 0) {
      console.error('[Screenshot] Crop resulted in empty image');
      throw new Error('Invalid crop area');
    }
  }

  // Save the screenshot
  console.log('[Screenshot] Saving image, size:', image.getSize());
  const result = await saveScreenshot(image);
  console.log('[Screenshot] Saved to:', result.filepath);

  // Show preview if enabled
  const showPreview = getSetting('showPreview');
  const previewDuration = getSetting('previewDuration');

  if (showPreview) {
    showPreviewPopup(result, previewDuration * 1000);
  }

  // Notify all windows
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((win) => {
    win.webContents.send('on:capture-complete', result);
  });

  return result;
}

export async function captureFullScreen(displayId?: number): Promise<CaptureResult> {
  return captureScreenshot({
    mode: 'fullscreen',
    displayId,
  });
}

export async function captureArea(area: SelectionArea, displayId?: number): Promise<CaptureResult> {
  return captureScreenshot({
    mode: 'area',
    displayId,
    area,
  });
}

function cropImage(image: Electron.NativeImage, area: SelectionArea, scaleFactor: number = 1): Electron.NativeImage {
  const rect = {
    x: Math.round(area.x * scaleFactor),
    y: Math.round(area.y * scaleFactor),
    width: Math.round(area.width * scaleFactor),
    height: Math.round(area.height * scaleFactor),
  };

  return image.crop(rect);
}

export function getDisplayInfo(): Array<{
  id: number;
  label: string;
  bounds: Electron.Rectangle;
  isPrimary: boolean;
  scaleFactor: number;
}> {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();

  return displays.map((display, index) => ({
    id: display.id,
    label: `Display ${index + 1}`,
    bounds: display.bounds,
    isPrimary: display.id === primary.id,
    scaleFactor: display.scaleFactor,
  }));
}
