import React from 'react';
import { Folder, FileText } from 'lucide-react';
import { useSettingsStore } from '../../stores/settings-store';

function FileSettings() {
  const { settings, updateSetting, selectSavePath } = useSettingsStore();

  if (!settings) return null;

  const handleBrowse = async () => {
    const result = await selectSavePath();
    if (!result.success) {
      console.error('Failed to select save path');
    }
  };

  // Generate preview filename
  const now = new Date();
  const previewFilename = `${settings.filePrefix}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}.${settings.screenshotFormat}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold text-content-primary">Files & Storage</h2>

      {/* Save Location */}
      <div className="py-4 border-b border-border">
        <h3 className="font-medium text-content-primary mb-2">Save Location</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={settings.savePath}
            readOnly
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-surface-secondary text-content-primary text-sm"
          />
          <button
            onClick={handleBrowse}
            className="px-4 py-2 bg-surface-tertiary text-content-primary rounded-lg hover:bg-surface-secondary transition-colors"
          >
            Browse...
          </button>
        </div>
      </div>

      {/* File Name Prefix */}
      <div className="py-4 border-b border-border">
        <h3 className="font-medium text-content-primary mb-2">File Name Prefix</h3>
        <input
          type="text"
          value={settings.filePrefix}
          onChange={(e) => updateSetting('filePrefix', e.target.value)}
          placeholder="Screenshot"
          className="w-full px-3 py-2 border border-border rounded-lg bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        />
        <p className="text-sm text-content-tertiary mt-2">
          Preview: <span className="font-mono text-content-secondary">{previewFilename}</span>
        </p>
      </div>

      {/* Screenshot Format */}
      <div className="py-4 border-b border-border">
        <h3 className="font-medium text-content-primary mb-2">Screenshot Format</h3>
        <select
          value={settings.screenshotFormat}
          onChange={(e) => updateSetting('screenshotFormat', e.target.value as 'png' | 'jpg')}
          className="w-full px-3 py-2 border border-border rounded-lg bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        >
          <option value="png">PNG (Lossless, larger file)</option>
          <option value="jpg">JPG (Smaller file, slight quality loss)</option>
        </select>
      </div>

      {/* Video Format */}
      <div className="py-4 border-b border-border">
        <h3 className="font-medium text-content-primary mb-2">Video Format</h3>
        <select
          value={settings.videoFormat}
          onChange={(e) => updateSetting('videoFormat', e.target.value as 'webm' | 'mp4')}
          className="w-full px-3 py-2 border border-border rounded-lg bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        >
          <option value="webm">WebM (Recommended)</option>
          <option value="mp4">MP4 (Better compatibility)</option>
        </select>
      </div>

      {/* Folder Organization */}
      <div className="py-4 border-b border-border">
        <h3 className="font-medium text-content-primary mb-2">Folder Organization</h3>
        <select
          value={settings.organizationStyle}
          onChange={(e) => updateSetting('organizationStyle', e.target.value as 'date' | 'flat')}
          className="w-full px-3 py-2 border border-border rounded-lg bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
        >
          <option value="date">Date-based (Year/Month/Day)</option>
          <option value="flat">Flat (All in one folder)</option>
        </select>

        {settings.organizationStyle === 'date' && (
          <div className="mt-3 p-3 bg-surface-secondary rounded-lg text-sm text-content-secondary">
            <p className="font-medium mb-2 text-content-primary">Folder structure preview:</p>
            <div className="font-mono text-xs space-y-0.5">
              <p className="flex items-center gap-1.5">
                <Folder size={14} className="text-accent" />
                {settings.savePath.split(/[/\\]/).pop()}/
              </p>
              <p className="ml-5 flex items-center gap-1.5">
                <Folder size={14} className="text-accent" />
                {now.getFullYear()}/
              </p>
              <p className="ml-10 flex items-center gap-1.5">
                <Folder size={14} className="text-accent" />
                {String(now.getMonth() + 1).padStart(2, '0')}/
              </p>
              <p className="ml-[60px] flex items-center gap-1.5">
                <Folder size={14} className="text-accent" />
                {String(now.getDate()).padStart(2, '0')}/
              </p>
              <p className="ml-[80px] flex items-center gap-1.5">
                <FileText size={14} className="text-content-tertiary" />
                {previewFilename}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileSettings;
