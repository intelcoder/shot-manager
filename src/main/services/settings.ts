import Store from 'electron-store';
import { app } from 'electron';
import path from 'path';
import os from 'os';
import type { AppSettings } from '../../shared/types/settings';
import { DEFAULT_SETTINGS } from '../../shared/types/settings';

let store: Store<AppSettings> | null = null;

export function initSettings(): void {
  store = new Store<AppSettings>({
    name: 'settings',
    defaults: {
      ...DEFAULT_SETTINGS,
      savePath: getDefaultSavePath(),
    },
  });
}

export function getSettings(): AppSettings {
  if (!store) {
    throw new Error('Settings not initialized');
  }
  return store.store;
}

export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  if (!store) {
    throw new Error('Settings not initialized');
  }
  return store.get(key);
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  if (!store) {
    throw new Error('Settings not initialized');
  }
  store.set(key, value);

  // Handle special cases
  if (key === 'launchAtStartup') {
    setAutoStart(value as boolean);
  }
}

export function resetSettings(): void {
  if (!store) {
    throw new Error('Settings not initialized');
  }
  store.clear();
}

function getDefaultSavePath(): string {
  const platform = process.platform;
  const picturesPath = app.getPath('pictures');

  return path.join(picturesPath, 'Shot Manager');
}

function setAutoStart(enabled: boolean): void {
  if (process.platform === 'darwin') {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true,
    });
  } else if (process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: app.getPath('exe'),
      args: ['--hidden'],
    });
  }
}

export function getSettingsStore(): Store<AppSettings> {
  if (!store) {
    throw new Error('Settings not initialized');
  }
  return store;
}
