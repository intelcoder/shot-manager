import React from 'react';
import { useSettingsStore } from '../../stores/settings-store';
import Toggle from '../common/Toggle';

function GeneralSettings() {
  const { settings, updateSetting } = useSettingsStore();

  if (!settings) return null;

  const isMac = navigator.platform.toLowerCase().includes('mac');

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-800">General</h2>

      {/* Launch at Startup */}
      <div className="flex items-center justify-between py-4 border-b">
        <div>
          <h3 className="font-medium text-gray-800">Launch at startup</h3>
          <p className="text-sm text-gray-500">
            Automatically start Shot Manager when you log in
          </p>
        </div>
        <Toggle
          checked={settings.launchAtStartup}
          onChange={(value) => updateSetting('launchAtStartup', value)}
        />
      </div>

      {/* Menu Bar / System Tray */}
      {isMac ? (
        <div className="flex items-center justify-between py-4 border-b">
          <div>
            <h3 className="font-medium text-gray-800">Show in menu bar</h3>
            <p className="text-sm text-gray-500">
              Display icon in the menu bar for quick access
            </p>
          </div>
          <Toggle
            checked={settings.showInMenuBar}
            onChange={(value) => updateSetting('showInMenuBar', value)}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between py-4 border-b">
          <div>
            <h3 className="font-medium text-gray-800">Show in system tray</h3>
            <p className="text-sm text-gray-500">
              Display icon in the system tray
            </p>
          </div>
          <Toggle
            checked={settings.showInTaskbar}
            onChange={(value) => updateSetting('showInTaskbar', value)}
          />
        </div>
      )}
    </div>
  );
}

export default GeneralSettings;
