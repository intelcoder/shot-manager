import React from 'react';
import type { CleanupRule } from '../../../shared/types/cleanup';

interface CleanupRuleItemProps {
  rule: CleanupRule;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onToggleEnabled: () => void;
  onRunNow: () => void;
  isExecuting: boolean;
}

function formatSchedule(rule: CleanupRule): string {
  if (rule.scheduleType === 'manual') {
    return 'Manual only';
  }
  const hour = rule.scheduleHour;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const frequency = rule.scheduleType === 'daily' ? 'Daily' : 'Weekly';
  return `${frequency} at ${displayHour}:00 ${ampm}`;
}

function formatConditions(rule: CleanupRule): string {
  const parts: string[] = [];

  parts.push(`Older than ${rule.olderThanDays} day${rule.olderThanDays !== 1 ? 's' : ''}`);

  if (!rule.includeStarred) {
    parts.push('Unstarred only');
  }

  if (!rule.includeTagged) {
    parts.push('Untagged only');
  }

  if (rule.captureTypes !== 'all') {
    parts.push(`${rule.captureTypes === 'screenshot' ? 'Screenshots' : 'Videos'} only`);
  }

  return parts.join(' | ');
}

function formatLastRun(rule: CleanupRule): string {
  if (!rule.lastRunAt) {
    return 'Never run';
  }
  const date = new Date(rule.lastRunAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Last run today (${rule.lastRunCount} items)`;
  } else if (diffDays === 1) {
    return `Last run yesterday (${rule.lastRunCount} items)`;
  } else {
    return `Last run ${diffDays} days ago (${rule.lastRunCount} items)`;
  }
}

function CleanupRuleItem({
  rule,
  onEdit,
  onDelete,
  onPreview,
  onToggleEnabled,
  onRunNow,
  isExecuting,
}: CleanupRuleItemProps) {
  return (
    <div
      className={`border rounded-lg p-4 transition-colors ${
        rule.enabled ? 'bg-surface-primary border-border' : 'bg-surface-secondary border-border opacity-75'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {/* Enable toggle */}
          <button
            onClick={onToggleEnabled}
            className={`mt-0.5 relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              rule.enabled ? 'bg-accent' : 'bg-surface-tertiary'
            }`}
            title={rule.enabled ? 'Disable rule' : 'Enable rule'}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                rule.enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>

          <div>
            <h4 className={`font-medium ${rule.enabled ? 'text-content-primary' : 'text-content-tertiary'}`}>
              {rule.name}
            </h4>
            <p className="text-sm text-content-tertiary mt-0.5">{formatConditions(rule)}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-content-tertiary">
              <span>{formatSchedule(rule)}</span>
              <span>{formatLastRun(rule)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPreview}
            className="px-3 py-1.5 text-sm text-content-secondary hover:text-content-primary hover:bg-surface-tertiary rounded transition-colors"
            title="Preview what will be deleted"
          >
            Preview
          </button>
          <button
            onClick={onRunNow}
            disabled={isExecuting}
            className="px-3 py-1.5 text-sm text-accent hover:text-accent-hover hover:bg-accent-subtle rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Run this rule now"
          >
            {isExecuting ? 'Running...' : 'Run Now'}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 text-content-tertiary hover:text-content-secondary hover:bg-surface-tertiary rounded transition-colors"
            title="Edit rule"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-content-tertiary hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="Delete rule"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default CleanupRuleItem;
