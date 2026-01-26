import { globalShortcut, BrowserWindow } from 'electron';
import Store from 'electron-store';
import { SHORTCUT_ACTIONS, type ShortcutConfig } from '../../shared/types/settings';
import { showMainWindow } from '../windows/main-window';
import { createCaptureOverlay } from '../windows/capture-window';

let shortcutStore: Store<ShortcutConfig> | null = null;
const registeredShortcuts = new Map<string, string>();

function getDefaultShortcuts(): ShortcutConfig {
  return SHORTCUT_ACTIONS.reduce((acc, action) => {
    acc[action.id] = action.defaultShortcut;
    return acc;
  }, {} as ShortcutConfig);
}

class ShortcutManager {
  constructor() {
    shortcutStore = new Store<ShortcutConfig>({
      name: 'shortcuts',
      defaults: getDefaultShortcuts(),
    });

    // Migrate problematic shortcuts
    this.migrateShortcuts();
  }

  private migrateShortcuts(): void {
    if (!shortcutStore) return;

    // Fix shortcuts that don't work on Windows
    const migrations: Record<string, string> = {
      'CommandOrControl+Shift+Escape': 'CommandOrControl+Shift+0',
    };

    const config = shortcutStore.store;
    for (const [actionId, accelerator] of Object.entries(config)) {
      if (migrations[accelerator]) {
        shortcutStore.set(actionId, migrations[accelerator]);
      }
    }
  }

  registerAll(): void {
    const config = shortcutStore?.store || getDefaultShortcuts();

    for (const [actionId, accelerator] of Object.entries(config)) {
      if (accelerator) {
        this.register(actionId, accelerator);
      }
    }
  }

  register(actionId: string, accelerator: string): boolean {
    // Unregister existing if any
    this.unregister(actionId);

    if (!accelerator) return true;

    try {
      const success = globalShortcut.register(accelerator, () => {
        this.executeAction(actionId);
      });

      if (success) {
        registeredShortcuts.set(actionId, accelerator);
        return true;
      }

      console.warn(`Failed to register shortcut: ${accelerator}`);
      return false;
    } catch (error) {
      console.error(`Error registering shortcut: ${error}`);
      return false;
    }
  }

  unregister(actionId: string): void {
    const accelerator = registeredShortcuts.get(actionId);
    if (accelerator) {
      try {
        globalShortcut.unregister(accelerator);
      } catch (e) {
        // Ignore errors when unregistering
      }
      registeredShortcuts.delete(actionId);
    }
  }

  updateShortcut(actionId: string, newAccelerator: string): { success: boolean; error?: string } {
    // Validate accelerator format
    if (newAccelerator && !this.isValidAccelerator(newAccelerator)) {
      return { success: false, error: 'invalid' };
    }

    // Check for conflicts
    const conflict = this.findConflict(actionId, newAccelerator);
    if (conflict) {
      return { success: false, error: 'conflict' };
    }

    // Register new shortcut
    if (this.register(actionId, newAccelerator)) {
      shortcutStore?.set(actionId, newAccelerator);
      return { success: true };
    }

    return { success: false, error: 'registration_failed' };
  }

  private isValidAccelerator(accelerator: string): boolean {
    if (!accelerator) return true;

    const validModifiers = [
      'Command', 'Cmd', 'Control', 'Ctrl', 'CommandOrControl',
      'CmdOrCtrl', 'Alt', 'Option', 'AltGr', 'Shift', 'Super', 'Meta'
    ];

    const parts = accelerator.split('+');

    // Must have at least modifier + key
    if (parts.length < 2) return false;

    // Check modifiers (all but last)
    const modifiers = parts.slice(0, -1);
    return modifiers.every((mod) => validModifiers.includes(mod));
  }

  private findConflict(actionId: string, accelerator: string): string | null {
    if (!accelerator) return null;

    for (const [id, acc] of registeredShortcuts) {
      if (id !== actionId && acc.toLowerCase() === accelerator.toLowerCase()) {
        return id;
      }
    }
    return null;
  }

  private executeAction(actionId: string): void {
    console.log(`Executing action: ${actionId}`);

    switch (actionId) {
      case 'screenshot-full':
        this.triggerScreenshot('fullscreen');
        break;
      case 'screenshot-area':
        this.triggerScreenshot('area');
        break;
      case 'record-full':
        this.triggerRecording('fullscreen');
        break;
      case 'record-area':
        this.triggerRecording('area');
        break;
      case 'record-stop':
        this.stopRecording();
        break;
      case 'open-dashboard':
        showMainWindow();
        break;
    }
  }

  private triggerScreenshot(mode: 'fullscreen' | 'area'): void {
    if (mode === 'area') {
      createCaptureOverlay('screenshot');
    } else {
      // Emit event to main window to capture fullscreen
      const windows = BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        win.webContents.send('shortcut:screenshot-full');
      });
    }
  }

  private triggerRecording(mode: 'fullscreen' | 'area'): void {
    if (mode === 'area') {
      createCaptureOverlay('video');
    } else {
      const windows = BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        win.webContents.send('shortcut:record-full');
      });
    }
  }

  private stopRecording(): void {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      win.webContents.send('shortcut:record-stop');
    });
  }

  unregisterAll(): void {
    globalShortcut.unregisterAll();
    registeredShortcuts.clear();
  }

  getConfig(): ShortcutConfig {
    return shortcutStore?.store || getDefaultShortcuts();
  }

  resetToDefaults(): void {
    this.unregisterAll();
    shortcutStore?.clear();
    this.registerAll();
  }
}

export const shortcutManager = new ShortcutManager();
