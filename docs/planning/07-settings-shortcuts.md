# Phase 7: Settings & Keyboard Shortcuts

## Objective
Implement fully customizable keyboard shortcuts and a comprehensive settings panel.

## Dependencies
- Phase 6 completed (dashboard UI working)

---

## 7.1 Keyboard Shortcut System

### Shortcut Architecture

```typescript
// src/shared/types/shortcuts.ts
interface ShortcutAction {
  id: string;
  label: string;
  description: string;
  category: 'capture' | 'recording' | 'app';
  defaultShortcut: string;  // Electron accelerator format
}

// Available actions
const SHORTCUT_ACTIONS: ShortcutAction[] = [
  // Capture
  {
    id: 'screenshot-full',
    label: 'Screenshot (Full Screen)',
    description: 'Capture the entire screen',
    category: 'capture',
    defaultShortcut: 'CommandOrControl+Shift+3'
  },
  {
    id: 'screenshot-area',
    label: 'Screenshot (Select Area)',
    description: 'Select and capture a region',
    category: 'capture',
    defaultShortcut: 'CommandOrControl+Shift+4'
  },
  // Recording
  {
    id: 'record-full',
    label: 'Record (Full Screen)',
    description: 'Start recording entire screen',
    category: 'recording',
    defaultShortcut: 'CommandOrControl+Shift+5'
  },
  {
    id: 'record-area',
    label: 'Record (Select Area)',
    description: 'Select and record a region',
    category: 'recording',
    defaultShortcut: 'CommandOrControl+Shift+6'
  },
  {
    id: 'record-stop',
    label: 'Stop Recording',
    description: 'Stop current recording',
    category: 'recording',
    defaultShortcut: 'CommandOrControl+Shift+Escape'
  },
  // App
  {
    id: 'open-dashboard',
    label: 'Open Dashboard',
    description: 'Show the main window',
    category: 'app',
    defaultShortcut: 'CommandOrControl+Shift+S'
  }
];
```

### Shortcut Manager

```typescript
// src/main/services/shortcuts.ts
import { globalShortcut, BrowserWindow } from 'electron';
import Store from 'electron-store';

interface ShortcutConfig {
  [actionId: string]: string;  // action -> accelerator
}

class ShortcutManager {
  private store: Store;
  private registeredShortcuts: Map<string, string> = new Map();

  constructor() {
    this.store = new Store({
      name: 'shortcuts',
      defaults: this.getDefaultShortcuts()
    });
  }

  private getDefaultShortcuts(): ShortcutConfig {
    return SHORTCUT_ACTIONS.reduce((acc, action) => {
      acc[action.id] = action.defaultShortcut;
      return acc;
    }, {} as ShortcutConfig);
  }

  /**
   * Register all shortcuts from config
   */
  registerAll(): void {
    const config = this.store.store as ShortcutConfig;

    for (const [actionId, accelerator] of Object.entries(config)) {
      if (accelerator) {
        this.register(actionId, accelerator);
      }
    }
  }

  /**
   * Register a single shortcut
   */
  register(actionId: string, accelerator: string): boolean {
    // Unregister existing if any
    this.unregister(actionId);

    try {
      const success = globalShortcut.register(accelerator, () => {
        this.executeAction(actionId);
      });

      if (success) {
        this.registeredShortcuts.set(actionId, accelerator);
        return true;
      }

      console.warn(`Failed to register shortcut: ${accelerator}`);
      return false;
    } catch (error) {
      console.error(`Error registering shortcut: ${error}`);
      return false;
    }
  }

  /**
   * Unregister a shortcut
   */
  unregister(actionId: string): void {
    const accelerator = this.registeredShortcuts.get(actionId);
    if (accelerator) {
      globalShortcut.unregister(accelerator);
      this.registeredShortcuts.delete(actionId);
    }
  }

  /**
   * Update shortcut for an action
   */
  updateShortcut(actionId: string, newAccelerator: string): boolean {
    // Validate accelerator format
    if (!this.isValidAccelerator(newAccelerator)) {
      return false;
    }

    // Check for conflicts
    if (this.hasConflict(actionId, newAccelerator)) {
      return false;
    }

    // Register new shortcut
    if (this.register(actionId, newAccelerator)) {
      this.store.set(actionId, newAccelerator);
      return true;
    }

    return false;
  }

  /**
   * Check if accelerator is valid
   */
  private isValidAccelerator(accelerator: string): boolean {
    const validModifiers = ['Command', 'Cmd', 'Control', 'Ctrl', 'CommandOrControl',
                           'CmdOrCtrl', 'Alt', 'Option', 'AltGr', 'Shift', 'Super', 'Meta'];
    const parts = accelerator.split('+');

    // Must have at least modifier + key
    if (parts.length < 2) return false;

    // Check modifiers
    const modifiers = parts.slice(0, -1);
    return modifiers.every(mod => validModifiers.includes(mod));
  }

  /**
   * Check for shortcut conflicts
   */
  private hasConflict(actionId: string, accelerator: string): boolean {
    for (const [id, acc] of this.registeredShortcuts) {
      if (id !== actionId && acc === accelerator) {
        return true;
      }
    }
    return false;
  }

  /**
   * Execute action when shortcut triggered
   */
  private executeAction(actionId: string): void {
    switch (actionId) {
      case 'screenshot-full':
        captureScreenshot({ mode: 'fullscreen' });
        break;
      case 'screenshot-area':
        captureScreenshot({ mode: 'area' });
        break;
      case 'record-full':
        startRecording({ mode: 'fullscreen' });
        break;
      case 'record-area':
        startRecording({ mode: 'area' });
        break;
      case 'record-stop':
        stopRecording();
        break;
      case 'open-dashboard':
        showDashboard();
        break;
    }
  }

  /**
   * Cleanup on app quit
   */
  unregisterAll(): void {
    globalShortcut.unregisterAll();
    this.registeredShortcuts.clear();
  }

  /**
   * Get current shortcut config
   */
  getConfig(): ShortcutConfig {
    return this.store.store as ShortcutConfig;
  }

  /**
   * Reset to defaults
   */
  resetToDefaults(): void {
    this.unregisterAll();
    this.store.clear();
    this.registerAll();
  }
}

export const shortcutManager = new ShortcutManager();
```

---

## 7.2 Shortcut Recording UI

### Shortcut Input Component

```typescript
// src/renderer/components/settings/ShortcutInput.tsx
interface ShortcutInputProps {
  value: string;
  onChange: (accelerator: string) => void;
  onConflict?: (conflictWith: string) => void;
  disabled?: boolean;
}

function ShortcutInput({ value, onChange, onConflict, disabled }: ShortcutInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isRecording) return;
    e.preventDefault();

    const key = e.key;
    const modifiers: string[] = [];

    if (e.ctrlKey || e.metaKey) modifiers.push('CommandOrControl');
    if (e.altKey) modifiers.push('Alt');
    if (e.shiftKey) modifiers.push('Shift');

    // Only record if we have modifiers + a non-modifier key
    if (modifiers.length > 0 && !['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
      const accelerator = [...modifiers, formatKey(key)].join('+');
      onChange(accelerator);
      setIsRecording(false);
    }

    setPressedKeys([...modifiers, key]);
  };

  const formatKey = (key: string): string => {
    // Convert key names to Electron accelerator format
    const keyMap: { [key: string]: string } = {
      ' ': 'Space',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      'Escape': 'Escape',
      // ... etc
    };
    return keyMap[key] || key.toUpperCase();
  };

  return (
    <div
      className={`shortcut-input ${isRecording ? 'recording' : ''}`}
      tabIndex={0}
      onClick={() => !disabled && setIsRecording(true)}
      onKeyDown={handleKeyDown}
      onBlur={() => setIsRecording(false)}
    >
      {isRecording ? (
        <span className="text-blue-500">Press shortcut...</span>
      ) : (
        <span>{formatAcceleratorDisplay(value) || 'Click to set'}</span>
      )}

      {value && !isRecording && (
        <button
          className="clear-btn"
          onClick={(e) => {
            e.stopPropagation();
            onChange('');
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// Format accelerator for display
function formatAcceleratorDisplay(accelerator: string): string {
  if (!accelerator) return '';

  const isMac = navigator.platform.includes('Mac');

  return accelerator
    .replace('CommandOrControl', isMac ? '⌘' : 'Ctrl')
    .replace('Command', '⌘')
    .replace('Control', 'Ctrl')
    .replace('Shift', isMac ? '⇧' : 'Shift')
    .replace('Alt', isMac ? '⌥' : 'Alt')
    .replace('Option', '⌥')
    .replace(/\+/g, ' + ');
}
```

### Visual Design - Shortcut Input
```
Default state:
┌──────────────────────────────┐
│  ⌘ + Shift + 3           [×] │
└──────────────────────────────┘

Recording state:
┌──────────────────────────────┐
│  Press shortcut...           │  ← Blue pulsing border
└──────────────────────────────┘

Empty state:
┌──────────────────────────────┐
│  Click to set                │  ← Gray text
└──────────────────────────────┘
```

---

## 7.3 Settings Panel

### Settings Store

```typescript
// src/renderer/stores/settings-store.ts
interface AppSettings {
  // General
  launchAtStartup: boolean;
  showInMenuBar: boolean;  // macOS
  showInTaskbar: boolean;  // Windows

  // Files
  savePath: string;
  filePrefix: string;
  screenshotFormat: 'png' | 'jpg' | 'webp';
  organizationStyle: 'date' | 'flat';

  // Capture
  playSound: boolean;
  showPreview: boolean;
  previewDuration: number;  // seconds
  copyToClipboard: boolean;

  // Recording
  videoFormat: 'webm' | 'mp4';
  videoQuality: 'low' | 'medium' | 'high';
  audioEnabled: boolean;
  defaultAudioDevice: string | null;

  // Shortcuts
  shortcuts: { [actionId: string]: string };
}

const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  isLoading: true,

  loadSettings: async () => {
    const settings = await window.electronAPI.getSettings();
    set({ settings, isLoading: false });
  },

  updateSetting: async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const result = await window.electronAPI.setSetting(key, value);
    if (result.success) {
      set((state) => ({
        settings: { ...state.settings!, [key]: value }
      }));
    }
    return result;
  },

  resetToDefaults: async () => {
    await window.electronAPI.resetSettings();
    await get().loadSettings();
  }
}));
```

### Settings Panel Component

```typescript
// src/renderer/components/settings/SettingsPanel.tsx
function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<'general' | 'files' | 'capture' | 'shortcuts'>('general');
  const { settings, updateSetting, isLoading } = useSettingsStore();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="settings-panel flex h-full">
      {/* Tabs */}
      <nav className="w-48 border-r p-4">
        <button
          className={activeTab === 'general' ? 'active' : ''}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          className={activeTab === 'files' ? 'active' : ''}
          onClick={() => setActiveTab('files')}
        >
          Files & Storage
        </button>
        <button
          className={activeTab === 'capture' ? 'active' : ''}
          onClick={() => setActiveTab('capture')}
        >
          Capture
        </button>
        <button
          className={activeTab === 'shortcuts' ? 'active' : ''}
          onClick={() => setActiveTab('shortcuts')}
        >
          Keyboard Shortcuts
        </button>
      </nav>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'files' && <FileSettings />}
        {activeTab === 'capture' && <CaptureSettings />}
        {activeTab === 'shortcuts' && <ShortcutSettings />}
      </div>
    </div>
  );
}
```

---

## 7.4 Settings Tabs

### General Settings

```typescript
// src/renderer/components/settings/GeneralSettings.tsx
function GeneralSettings() {
  const { settings, updateSetting } = useSettingsStore();
  const isMac = navigator.platform.includes('Mac');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">General</h2>

      {/* Launch at Startup */}
      <div className="setting-row">
        <div>
          <label>Launch at startup</label>
          <p className="text-sm text-gray-500">
            Automatically start Shot Manager when you log in
          </p>
        </div>
        <Toggle
          checked={settings.launchAtStartup}
          onChange={(v) => updateSetting('launchAtStartup', v)}
        />
      </div>

      {/* Menu Bar / Taskbar */}
      {isMac ? (
        <div className="setting-row">
          <div>
            <label>Show in menu bar</label>
            <p className="text-sm text-gray-500">
              Display icon in the menu bar for quick access
            </p>
          </div>
          <Toggle
            checked={settings.showInMenuBar}
            onChange={(v) => updateSetting('showInMenuBar', v)}
          />
        </div>
      ) : (
        <div className="setting-row">
          <div>
            <label>Show in system tray</label>
            <p className="text-sm text-gray-500">
              Display icon in the system tray
            </p>
          </div>
          <Toggle
            checked={settings.showInTaskbar}
            onChange={(v) => updateSetting('showInTaskbar', v)}
          />
        </div>
      )}
    </div>
  );
}
```

### Capture Settings

```typescript
// src/renderer/components/settings/CaptureSettings.tsx
function CaptureSettings() {
  const { settings, updateSetting } = useSettingsStore();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Capture</h2>

      {/* Play Sound */}
      <div className="setting-row">
        <div>
          <label>Play sound</label>
          <p className="text-sm text-gray-500">
            Play a camera shutter sound when capturing
          </p>
        </div>
        <Toggle
          checked={settings.playSound}
          onChange={(v) => updateSetting('playSound', v)}
        />
      </div>

      {/* Show Preview */}
      <div className="setting-row">
        <div>
          <label>Show preview</label>
          <p className="text-sm text-gray-500">
            Display a popup preview after capture
          </p>
        </div>
        <Toggle
          checked={settings.showPreview}
          onChange={(v) => updateSetting('showPreview', v)}
        />
      </div>

      {/* Preview Duration */}
      {settings.showPreview && (
        <div className="setting-row ml-6">
          <label>Preview duration</label>
          <select
            value={settings.previewDuration}
            onChange={(e) => updateSetting('previewDuration', Number(e.target.value))}
          >
            <option value={3}>3 seconds</option>
            <option value={5}>5 seconds</option>
            <option value={10}>10 seconds</option>
          </select>
        </div>
      )}

      {/* Copy to Clipboard */}
      <div className="setting-row">
        <div>
          <label>Copy to clipboard</label>
          <p className="text-sm text-gray-500">
            Automatically copy captures to clipboard
          </p>
        </div>
        <Toggle
          checked={settings.copyToClipboard}
          onChange={(v) => updateSetting('copyToClipboard', v)}
        />
      </div>

      <hr />

      <h3 className="text-lg font-semibold">Video Recording</h3>

      {/* Video Quality */}
      <div className="setting-row">
        <label>Video quality</label>
        <select
          value={settings.videoQuality}
          onChange={(e) => updateSetting('videoQuality', e.target.value)}
        >
          <option value="low">Low (720p)</option>
          <option value="medium">Medium (1080p)</option>
          <option value="high">High (Original)</option>
        </select>
      </div>

      {/* Audio */}
      <div className="setting-row">
        <div>
          <label>Enable audio by default</label>
          <p className="text-sm text-gray-500">
            Record microphone audio with video
          </p>
        </div>
        <Toggle
          checked={settings.audioEnabled}
          onChange={(v) => updateSetting('audioEnabled', v)}
        />
      </div>
    </div>
  );
}
```

### Shortcut Settings

```typescript
// src/renderer/components/settings/ShortcutSettings.tsx
function ShortcutSettings() {
  const { settings, updateSetting } = useSettingsStore();
  const [conflict, setConflict] = useState<string | null>(null);

  const handleShortcutChange = async (actionId: string, accelerator: string) => {
    const result = await window.electronAPI.updateShortcut(actionId, accelerator);

    if (!result.success) {
      if (result.error === 'conflict') {
        setConflict(`This shortcut is already used by "${result.conflictWith}"`);
      }
      return;
    }

    setConflict(null);
    updateSetting('shortcuts', {
      ...settings.shortcuts,
      [actionId]: accelerator
    });
  };

  const groupedActions = {
    capture: SHORTCUT_ACTIONS.filter(a => a.category === 'capture'),
    recording: SHORTCUT_ACTIONS.filter(a => a.category === 'recording'),
    app: SHORTCUT_ACTIONS.filter(a => a.category === 'app')
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
        <button
          className="text-blue-600"
          onClick={() => window.electronAPI.resetShortcuts()}
        >
          Reset to Defaults
        </button>
      </div>

      {conflict && (
        <div className="bg-red-100 text-red-700 p-3 rounded">
          {conflict}
        </div>
      )}

      {/* Capture Shortcuts */}
      <section>
        <h3 className="font-semibold mb-3">Capture</h3>
        <div className="space-y-3">
          {groupedActions.capture.map((action) => (
            <div key={action.id} className="flex justify-between items-center">
              <div>
                <div className="font-medium">{action.label}</div>
                <div className="text-sm text-gray-500">{action.description}</div>
              </div>
              <ShortcutInput
                value={settings.shortcuts[action.id] || ''}
                onChange={(acc) => handleShortcutChange(action.id, acc)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Recording Shortcuts */}
      <section>
        <h3 className="font-semibold mb-3">Recording</h3>
        <div className="space-y-3">
          {groupedActions.recording.map((action) => (
            <div key={action.id} className="flex justify-between items-center">
              <div>
                <div className="font-medium">{action.label}</div>
                <div className="text-sm text-gray-500">{action.description}</div>
              </div>
              <ShortcutInput
                value={settings.shortcuts[action.id] || ''}
                onChange={(acc) => handleShortcutChange(action.id, acc)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* App Shortcuts */}
      <section>
        <h3 className="font-semibold mb-3">Application</h3>
        <div className="space-y-3">
          {groupedActions.app.map((action) => (
            <div key={action.id} className="flex justify-between items-center">
              <div>
                <div className="font-medium">{action.label}</div>
                <div className="text-sm text-gray-500">{action.description}</div>
              </div>
              <ShortcutInput
                value={settings.shortcuts[action.id] || ''}
                onChange={(acc) => handleShortcutChange(action.id, acc)}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

### Visual Design - Shortcuts Settings
```
┌─────────────────────────────────────────────────────────────┐
│  Keyboard Shortcuts                    [Reset to Defaults]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Capture                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Screenshot (Full Screen)         [⌘ + Shift + 3     ×] ││
│  │ Capture the entire screen                               ││
│  │─────────────────────────────────────────────────────────││
│  │ Screenshot (Select Area)         [⌘ + Shift + 4     ×] ││
│  │ Select and capture a region                             ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Recording                                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Record (Full Screen)             [⌘ + Shift + 5     ×] ││
│  │ Start recording entire screen                           ││
│  │─────────────────────────────────────────────────────────││
│  │ Stop Recording                   [⌘ + Shift + Esc   ×] ││
│  │ Stop current recording                                  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7.5 IPC Handlers for Settings

```typescript
// src/main/ipc/settings-handlers.ts
import { ipcMain, app } from 'electron';
import Store from 'electron-store';
import { shortcutManager } from '../services/shortcuts';

export function registerSettingsHandlers() {
  const settingsStore = new Store({ name: 'settings' });

  // Get all settings
  ipcMain.handle('settings:get', () => {
    return {
      ...settingsStore.store,
      shortcuts: shortcutManager.getConfig()
    };
  });

  // Update single setting
  ipcMain.handle('settings:set', (event, key, value) => {
    settingsStore.set(key, value);

    // Handle special cases
    if (key === 'launchAtStartup') {
      app.setLoginItemSettings({ openAtLogin: value });
    }

    return { success: true };
  });

  // Update shortcut
  ipcMain.handle('shortcut:update', (event, actionId, accelerator) => {
    const result = shortcutManager.updateShortcut(actionId, accelerator);
    return result
      ? { success: true }
      : { success: false, error: 'conflict' };
  });

  // Reset shortcuts
  ipcMain.handle('shortcut:reset', () => {
    shortcutManager.resetToDefaults();
    return { success: true };
  });

  // Reset all settings
  ipcMain.handle('settings:reset', () => {
    settingsStore.clear();
    shortcutManager.resetToDefaults();
    return { success: true };
  });
}
```

---

## 7.6 Auto-Start Configuration

```typescript
// src/main/services/auto-start.ts
import { app } from 'electron';

function setAutoStart(enabled: boolean): void {
  if (process.platform === 'darwin') {
    // macOS
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true  // Start minimized to tray
    });
  } else if (process.platform === 'win32') {
    // Windows
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: app.getPath('exe'),
      args: ['--hidden']  // Custom arg to start hidden
    });
  }
}

function getAutoStartStatus(): boolean {
  const settings = app.getLoginItemSettings();
  return settings.openAtLogin;
}
```

---

## 7.7 Deliverables

After Phase 7 completion:
- [ ] All shortcuts customizable
- [ ] Shortcut recording works (press to set)
- [ ] Shortcut conflicts detected
- [ ] Reset to defaults works
- [ ] Settings panel opens
- [ ] All settings save correctly
- [ ] Settings persist between restarts
- [ ] Launch at startup works
- [ ] Shortcuts trigger correct actions

---

## 7.8 Verification

```bash
# Test scenarios:
# 1. Open settings → all tabs load
# 2. Change shortcut → new shortcut works
# 3. Set conflicting shortcut → error shown
# 4. Clear shortcut → action has no shortcut
# 5. Reset shortcuts → defaults restored
# 6. Enable launch at startup → app starts on login
# 7. Change save path → captures use new path
# 8. Change file prefix → filenames update
# 9. Toggle preview → preview behavior changes
# 10. Close and reopen app → settings preserved
```
