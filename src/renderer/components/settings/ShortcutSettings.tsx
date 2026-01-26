import React, { useState } from 'react';
import { useSettingsStore } from '../../stores/settings-store';
import ShortcutInput from './ShortcutInput';
import { SHORTCUT_ACTIONS } from '../../../shared/types/settings';

function ShortcutSettings() {
  const { shortcuts, updateShortcut, resetShortcuts } = useSettingsStore();
  const [error, setError] = useState<string | null>(null);

  if (!shortcuts) return null;

  const handleShortcutChange = async (actionId: string, accelerator: string) => {
    setError(null);
    const result = await updateShortcut(actionId, accelerator);

    if (!result.success) {
      if (result.error === 'conflict') {
        setError('This shortcut is already in use by another action');
      } else if (result.error === 'invalid') {
        setError('Invalid shortcut format');
      } else {
        setError('Failed to register shortcut');
      }
    }
  };

  const handleReset = async () => {
    if (confirm('Reset all shortcuts to default values?')) {
      await resetShortcuts();
    }
  };

  const groupedActions = {
    capture: SHORTCUT_ACTIONS.filter((a) => a.category === 'capture'),
    recording: SHORTCUT_ACTIONS.filter((a) => a.category === 'recording'),
    app: SHORTCUT_ACTIONS.filter((a) => a.category === 'app'),
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Keyboard Shortcuts</h2>
        <button
          onClick={handleReset}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          Reset to Defaults
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Capture Shortcuts */}
      <section>
        <h3 className="font-semibold text-gray-700 mb-3">Capture</h3>
        <div className="space-y-3">
          {groupedActions.capture.map((action) => (
            <div
              key={action.id}
              className="flex items-center justify-between py-3 border-b"
            >
              <div>
                <h4 className="font-medium text-gray-800">{action.label}</h4>
                <p className="text-sm text-gray-500">{action.description}</p>
              </div>
              <ShortcutInput
                value={shortcuts[action.id] || ''}
                onChange={(accelerator) => handleShortcutChange(action.id, accelerator)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Recording Shortcuts */}
      <section>
        <h3 className="font-semibold text-gray-700 mb-3">Recording</h3>
        <div className="space-y-3">
          {groupedActions.recording.map((action) => (
            <div
              key={action.id}
              className="flex items-center justify-between py-3 border-b"
            >
              <div>
                <h4 className="font-medium text-gray-800">{action.label}</h4>
                <p className="text-sm text-gray-500">{action.description}</p>
              </div>
              <ShortcutInput
                value={shortcuts[action.id] || ''}
                onChange={(accelerator) => handleShortcutChange(action.id, accelerator)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* App Shortcuts */}
      <section>
        <h3 className="font-semibold text-gray-700 mb-3">Application</h3>
        <div className="space-y-3">
          {groupedActions.app.map((action) => (
            <div
              key={action.id}
              className="flex items-center justify-between py-3 border-b"
            >
              <div>
                <h4 className="font-medium text-gray-800">{action.label}</h4>
                <p className="text-sm text-gray-500">{action.description}</p>
              </div>
              <ShortcutInput
                value={shortcuts[action.id] || ''}
                onChange={(accelerator) => handleShortcutChange(action.id, accelerator)}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ShortcutSettings;
