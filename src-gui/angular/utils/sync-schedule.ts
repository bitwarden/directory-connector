/** Scheduled syncs are disabled for intervals shorter than this. */
export const MinSyncIntervalMinutes = 5;

/**
 * When the next scheduled sync becomes due: one interval after the older of the last user and
 * group syncs. Returns the epoch when nothing has synced yet (due immediately), and null when the
 * interval is too short for scheduled syncing.
 *
 * The scheduler checks once a minute, so a due sync starts within a minute of this time.
 */
export function getNextSyncDue(
  intervalMinutes: number | null | undefined,
  lastGroupSync: Date | null,
  lastUserSync: Date | null,
): Date | null {
  if (intervalMinutes == null || intervalMinutes < MinSyncIntervalMinutes) {
    return null;
  }

  const lastSyncTimes = [lastGroupSync, lastUserSync]
    .filter((d): d is Date => d != null)
    .map((d) => d.getTime());
  if (lastSyncTimes.length === 0) {
    return new Date(0);
  }

  return new Date(Math.min(...lastSyncTimes) + intervalMinutes * 60_000);
}
