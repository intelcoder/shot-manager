import React, { useState } from 'react';
import type { CleanupRule, CreateCleanupRuleInput, UpdateCleanupRuleInput } from '../../../shared/types/cleanup';

interface CleanupRuleEditorProps {
  rule: CleanupRule | null;
  onSave: (input: CreateCleanupRuleInput | UpdateCleanupRuleInput) => Promise<void>;
  onClose: () => void;
}

// Reusable form field components for extensibility
interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
}

function FormField({ label, children, hint }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

interface ToggleOptionProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleOption({ label, checked, onChange }: ToggleOptionProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
      />
      <span className="text-sm text-gray-600">{label}</span>
    </label>
  );
}

// Hour options for schedule
const HOURS = Array.from({ length: 24 }, (_, i) => {
  const ampm = i >= 12 ? 'PM' : 'AM';
  const displayHour = i % 12 || 12;
  return { value: i, label: `${displayHour}:00 ${ampm}` };
});

function CleanupRuleEditor({ rule, onSave, onClose }: CleanupRuleEditorProps) {
  // Form state
  const [formData, setFormData] = useState({
    name: rule?.name ?? '',
    olderThanDays: rule?.olderThanDays ?? 14,
    includeStarred: rule?.includeStarred ?? false,
    includeTagged: rule?.includeTagged ?? false,
    captureTypes: rule?.captureTypes ?? 'all' as 'all' | 'screenshot' | 'video',
    scheduleType: rule?.scheduleType ?? 'manual' as 'manual' | 'daily' | 'weekly',
    scheduleHour: rule?.scheduleHour ?? 3,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update single form field
  const updateField = <K extends keyof typeof formData>(
    field: K,
    value: typeof formData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null); // Clear error on input change
  };

  // Validation
  const validate = (): string | null => {
    if (!formData.name.trim()) {
      return 'Please enter a rule name';
    }
    if (formData.olderThanDays < 1) {
      return 'Days must be at least 1';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const input: CreateCleanupRuleInput = {
        name: formData.name.trim(),
        enabled: true,
        olderThanDays: formData.olderThanDays,
        includeStarred: formData.includeStarred,
        includeTagged: formData.includeTagged,
        captureTypes: formData.captureTypes,
        scheduleType: formData.scheduleType,
        scheduleHour: formData.scheduleHour,
      };
      await onSave(input);
    } catch (err) {
      setError((err as Error).message || 'Failed to save rule');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            {rule ? 'Edit Cleanup Rule' : 'Create Cleanup Rule'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Configure conditions for automatic capture cleanup.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="p-6 space-y-5">
            {/* Error display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Rule Name */}
            <FormField label="Rule Name">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Clean old untagged captures"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                autoFocus
              />
            </FormField>

            {/* Age Condition */}
            <FormField label="Delete captures older than">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.olderThanDays}
                  onChange={(e) => updateField('olderThanDays', Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <span className="text-gray-600">days</span>
              </div>
            </FormField>

            {/* Protection Options */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Protection Options</label>
              <div className="space-y-2 pl-1">
                <ToggleOption
                  label="Protect starred captures"
                  checked={!formData.includeStarred}
                  onChange={(checked) => updateField('includeStarred', !checked)}
                />
                <ToggleOption
                  label="Protect tagged captures (only delete untagged)"
                  checked={!formData.includeTagged}
                  onChange={(checked) => updateField('includeTagged', !checked)}
                />
              </div>
            </div>

            {/* Capture Types */}
            <FormField label="Apply to">
              <select
                value={formData.captureTypes}
                onChange={(e) => updateField('captureTypes', e.target.value as 'all' | 'screenshot' | 'video')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value="all">All captures</option>
                <option value="screenshot">Screenshots only</option>
                <option value="video">Videos only</option>
              </select>
            </FormField>

            {/* Schedule Type */}
            <FormField label="Schedule">
              <select
                value={formData.scheduleType}
                onChange={(e) => updateField('scheduleType', e.target.value as 'manual' | 'daily' | 'weekly')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              >
                <option value="manual">Manual only</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </FormField>

            {/* Schedule Hour (conditional) */}
            {formData.scheduleType !== 'manual' && (
              <FormField
                label="Run at"
                hint="The cleanup will run automatically when the app is running at this time."
              >
                <select
                  value={formData.scheduleHour}
                  onChange={(e) => updateField('scheduleHour', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  {HOURS.map((hour) => (
                    <option key={hour.value} value={hour.value}>
                      {hour.label}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {isSaving ? 'Saving...' : rule ? 'Save Changes' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CleanupRuleEditor;
