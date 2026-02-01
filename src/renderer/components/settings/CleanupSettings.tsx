import React, { useEffect, useState } from 'react';
import { useCleanupStore } from '../../stores/cleanup-store';
import CleanupRuleItem from './CleanupRuleItem';
import CleanupRuleEditor from './CleanupRuleEditor';
import CleanupPreviewModal from './CleanupPreviewModal';
import type { CleanupRule, CreateCleanupRuleInput, UpdateCleanupRuleInput } from '../../../shared/types/cleanup';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function CleanupSettings() {
  const {
    rules,
    history,
    isLoading,
    loadRules,
    loadHistory,
    createRule,
    updateRule,
    deleteRule,
    previewRule,
    executeRule,
    previewData,
    isPreviewLoading,
    clearPreview,
    lastResult,
    clearLastResult,
    isExecuting,
  } = useCleanupStore();

  const [showEditor, setShowEditor] = useState(false);
  const [editingRule, setEditingRule] = useState<CleanupRule | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewRuleId, setPreviewRuleId] = useState<number | null>(null);

  useEffect(() => {
    loadRules();
    loadHistory();
  }, [loadRules, loadHistory]);

  const handleCreateRule = () => {
    setEditingRule(null);
    setShowEditor(true);
  };

  const handleEditRule = (rule: CleanupRule) => {
    setEditingRule(rule);
    setShowEditor(true);
  };

  const handleSaveRule = async (input: CreateCleanupRuleInput | UpdateCleanupRuleInput) => {
    if (editingRule) {
      await updateRule(editingRule.id, input as UpdateCleanupRuleInput);
    } else {
      await createRule(input as CreateCleanupRuleInput);
    }
    setShowEditor(false);
    setEditingRule(null);
  };

  const handleDeleteRule = async (rule: CleanupRule) => {
    if (confirm(`Delete rule "${rule.name}"?`)) {
      await deleteRule(rule.id);
    }
  };

  const handlePreviewRule = async (rule: CleanupRule) => {
    setPreviewRuleId(rule.id);
    setShowPreview(true);
    await previewRule(rule.id);
  };

  const handleExecuteFromPreview = async () => {
    if (previewRuleId) {
      await executeRule(previewRuleId);
      setShowPreview(false);
      clearPreview();
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    clearPreview();
  };

  const handleToggleEnabled = async (rule: CleanupRule) => {
    await updateRule(rule.id, { enabled: !rule.enabled });
  };

  const handleRunNow = async (rule: CleanupRule) => {
    if (confirm(`Run cleanup rule "${rule.name}" now?`)) {
      await executeRule(rule.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin text-2xl">...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-content-primary">Auto-Cleanup Rules</h3>
        <p className="text-sm text-content-tertiary mt-1">
          Configure rules to automatically delete old captures based on age, star status, and tags.
        </p>
      </div>

      {/* Last result notification */}
      {lastResult && (
        <div
          className={`p-4 rounded-lg ${
            lastResult.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium ${lastResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {lastResult.success ? 'Cleanup completed' : 'Cleanup completed with errors'}
              </p>
              <p className="text-sm text-content-secondary mt-1">
                Deleted {lastResult.deletedCount} item{lastResult.deletedCount !== 1 ? 's' : ''}, freed{' '}
                {formatBytes(lastResult.freedBytes)}
              </p>
              {lastResult.errors.length > 0 && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{lastResult.errors.length} error(s) occurred</p>
              )}
            </div>
            <button
              onClick={clearLastResult}
              className="text-content-tertiary hover:text-content-secondary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="text-center py-8 bg-surface-secondary rounded-lg border-2 border-dashed border-border">
            <svg
              className="w-12 h-12 mx-auto text-content-tertiary mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <p className="text-content-secondary mb-2">No cleanup rules configured</p>
            <p className="text-sm text-content-tertiary">Create a rule to automatically clean up old captures</p>
          </div>
        ) : (
          rules.map((rule) => (
            <CleanupRuleItem
              key={rule.id}
              rule={rule}
              onEdit={() => handleEditRule(rule)}
              onDelete={() => handleDeleteRule(rule)}
              onPreview={() => handlePreviewRule(rule)}
              onToggleEnabled={() => handleToggleEnabled(rule)}
              onRunNow={() => handleRunNow(rule)}
              isExecuting={isExecuting}
            />
          ))
        )}
      </div>

      {/* Add rule button */}
      <button
        onClick={handleCreateRule}
        className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Rule
      </button>

      {/* History section */}
      {history.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border">
          <h4 className="text-sm font-medium text-content-secondary mb-3">Cleanup History</h4>
          <div className="space-y-2">
            {history.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm text-content-secondary">
                <span>
                  {formatDate(entry.executedAt)}: {entry.ruleName}
                </span>
                <span>
                  Deleted {entry.deletedCount} item{entry.deletedCount !== 1 ? 's' : ''} ({formatBytes(entry.freedBytes)})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor modal */}
      {showEditor && (
        <CleanupRuleEditor
          rule={editingRule}
          onSave={handleSaveRule}
          onClose={() => {
            setShowEditor(false);
            setEditingRule(null);
          }}
        />
      )}

      {/* Preview modal */}
      {showPreview && (
        <CleanupPreviewModal
          preview={previewData}
          isLoading={isPreviewLoading}
          isExecuting={isExecuting}
          onExecute={handleExecuteFromPreview}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
}

export default CleanupSettings;
