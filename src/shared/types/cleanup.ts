export interface CleanupRule {
  id: number;
  name: string;
  enabled: boolean;
  olderThanDays: number;
  includeStarred: boolean;   // false = protect starred items
  includeTagged: boolean;    // false = only delete untagged
  captureTypes: 'all' | 'screenshot' | 'video';
  scheduleType: 'manual' | 'daily' | 'weekly';
  scheduleHour: number;
  lastRunAt: string | null;
  lastRunCount: number;
  createdAt: string;
}

export interface CreateCleanupRuleInput {
  name: string;
  enabled?: boolean;
  olderThanDays: number;
  includeStarred?: boolean;
  includeTagged?: boolean;
  captureTypes?: 'all' | 'screenshot' | 'video';
  scheduleType?: 'manual' | 'daily' | 'weekly';
  scheduleHour?: number;
}

export interface UpdateCleanupRuleInput {
  name?: string;
  enabled?: boolean;
  olderThanDays?: number;
  includeStarred?: boolean;
  includeTagged?: boolean;
  captureTypes?: 'all' | 'screenshot' | 'video';
  scheduleType?: 'manual' | 'daily' | 'weekly';
  scheduleHour?: number;
}

export interface CleanupPreview {
  ruleId: number;
  totalCount: number;
  totalSizeBytes: number;
  captures: { id: number; filename: string; size: number; createdAt: string }[];
}

export interface CleanupResult {
  success: boolean;
  deletedCount: number;
  freedBytes: number;
  errors: string[];
}

export interface CleanupHistoryEntry {
  id: number;
  ruleId: number | null;
  ruleName: string;
  deletedCount: number;
  freedBytes: number;
  executedAt: string;
}
