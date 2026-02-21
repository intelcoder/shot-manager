import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

/**
 * Regression tests for the local-media:// protocol handler.
 *
 * Critical bug fixed: net.fetch(pathToFileURL(filePath)) silently fails on
 * Windows. The handler now uses fs.promises.readFile directly.
 */

type ProtocolHandler = (req: { url: string }) => Promise<Response>;
let registeredHandler: ProtocolHandler | null = null;

const mockReadFile = vi.fn();

vi.mock('electron', () => ({
  app: {
    whenReady: vi.fn().mockReturnValue(Promise.resolve()),
    requestSingleInstanceLock: vi.fn().mockReturnValue(true),
    on: vi.fn(),
    quit: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn().mockReturnValue([]),
  },
  protocol: {
    registerSchemesAsPrivileged: vi.fn(),
    handle: vi.fn((scheme: string, handler: ProtocolHandler) => {
      if (scheme === 'local-media') registeredHandler = handler;
    }),
  },
}));

vi.mock('fs', () => ({
  default: {
    promises: { readFile: mockReadFile },
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
  promises: { readFile: mockReadFile },
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('./windows/main-window', () => ({
  createMainWindow: vi.fn(),
  getMainWindow: vi.fn().mockReturnValue(null),
  showMainWindow: vi.fn(),
}));
vi.mock('./tray', () => ({ createTray: vi.fn() }));
vi.mock('./ipc/handlers', () => ({ registerIpcHandlers: vi.fn() }));
vi.mock('./services/database', () => ({ initDatabase: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./services/shortcuts', () => ({
  shortcutManager: { registerAll: vi.fn(), unregisterAll: vi.fn() },
}));
vi.mock('./services/settings', () => ({ initSettings: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./services/cleanup-scheduler', () => ({
  initCleanupScheduler: vi.fn(),
  stopCleanupScheduler: vi.fn(),
}));

// Import index.ts once — this schedules app.whenReady().then(initialize).
// One microtask flush lets initialize() run up to protocol.handle (before its first await),
// which sets registeredHandler.
beforeAll(async () => {
  await import('./index');
  await Promise.resolve();
});

describe('local-media protocol handler', () => {
  beforeEach(() => {
    mockReadFile.mockReset();
  });

  it('reads the file with fs.promises.readFile and returns the correct Content-Type for PNG', async () => {
    expect(registeredHandler).not.toBeNull();
    mockReadFile.mockResolvedValue(Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const response = await registeredHandler!({
      url: 'local-media://media/C%3A%2FUsers%2Ftest%2Fimage.png',
    });

    expect(mockReadFile).toHaveBeenCalledWith('C:/Users/test/image.png');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
  });

  it('returns video/webm Content-Type for .webm files', async () => {
    expect(registeredHandler).not.toBeNull();
    mockReadFile.mockResolvedValue(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));

    const response = await registeredHandler!({
      url: 'local-media://media/C%3A%2FUsers%2Ftest%2Frecording.webm',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('video/webm');
  });

  it('returns 404 when the file cannot be read', async () => {
    expect(registeredHandler).not.toBeNull();
    mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const response = await registeredHandler!({
      url: 'local-media://media/C%3A%2FUsers%2Ftest%2Fmissing.png',
    });

    expect(response.status).toBe(404);
  });

  it('URL-decodes the path before reading (supports special characters in paths)', async () => {
    expect(registeredHandler).not.toBeNull();
    mockReadFile.mockResolvedValue(Buffer.from([]));

    await registeredHandler!({
      url: 'local-media://media/C%3A%2FUsers%2Fmy%20user%2Fscreenshots%2Ftest.jpg',
    });

    expect(mockReadFile).toHaveBeenCalledWith('C:/Users/my user/screenshots/test.jpg');
  });
});
