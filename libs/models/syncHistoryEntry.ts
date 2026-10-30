/** How many past sync runs are kept in state. Older entries are dropped first. */
export const MaxSyncHistoryEntries = 50;

/** One recorded sync run, shown in the dashboard's sync history. */
export interface SyncHistoryEntry {
  /** ISO 8601 timestamp of when the run started. */
  startedAt: string;
  durationMs: number;
  /** The directory profile that was active for the run, if known. */
  profileName?: string;
  /** `success` and `failed` describe runs that posted (or tried to post) to Bitwarden. */
  status: "success" | "failed" | "noChanges";
  /** Users and groups read from the directory. Null when the run failed before reading them. */
  userCount: number | null;
  groupCount: number | null;
  /** A short, user-facing error message for failed runs. */
  error?: string;
}
