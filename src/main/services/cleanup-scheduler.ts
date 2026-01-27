import { getEnabledScheduledRules, executeCleanup } from './cleanup';

const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Initialize the cleanup scheduler
 * Checks scheduled rules every hour and executes them when due
 */
export function initCleanupScheduler(): void {
  console.log('[CleanupScheduler] Initializing...');

  // Run initial check on startup (with a small delay)
  setTimeout(checkScheduledRules, 5000);

  // Set up hourly checks
  schedulerInterval = setInterval(checkScheduledRules, CHECK_INTERVAL);
}

/**
 * Stop the cleanup scheduler
 */
export function stopCleanupScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[CleanupScheduler] Stopped');
  }
}

/**
 * Check all enabled scheduled rules and run those that are due
 */
async function checkScheduledRules(): Promise<void> {
  console.log('[CleanupScheduler] Checking scheduled rules...');

  try {
    const rules = getEnabledScheduledRules();

    for (const rule of rules) {
      if (shouldRunNow(rule)) {
        console.log(`[CleanupScheduler] Running scheduled cleanup: ${rule.name}`);
        try {
          const result = await executeCleanup(rule.id);
          console.log(`[CleanupScheduler] Cleanup completed: deleted ${result.deletedCount} items`);
        } catch (error) {
          console.error(`[CleanupScheduler] Failed to execute cleanup rule ${rule.name}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('[CleanupScheduler] Error checking scheduled rules:', error);
  }
}

/**
 * Determine if a rule should run now based on its schedule
 */
function shouldRunNow(rule: {
  scheduleType: 'daily' | 'weekly';
  scheduleHour: number;
  lastRunAt: string | null;
}): boolean {
  const now = new Date();
  const currentHour = now.getHours();

  // Only run during the scheduled hour
  if (currentHour !== rule.scheduleHour) {
    return false;
  }

  // Check if already ran today/this week
  if (rule.lastRunAt) {
    const lastRun = new Date(rule.lastRunAt);

    if (rule.scheduleType === 'daily') {
      // Check if ran today
      if (
        lastRun.getFullYear() === now.getFullYear() &&
        lastRun.getMonth() === now.getMonth() &&
        lastRun.getDate() === now.getDate()
      ) {
        return false;
      }
    } else if (rule.scheduleType === 'weekly') {
      // Check if ran this week (within last 7 days)
      const daysSinceLastRun = Math.floor(
        (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastRun < 7) {
        return false;
      }
    }
  }

  return true;
}

export { checkScheduledRules };
