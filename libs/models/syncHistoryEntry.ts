/** How many past sync runs are kept in state. Older entries are dropped first. */
export const MaxSyncHistoryEntries = 50;

/** How many example names each details list keeps. The counts are always totals. */
export const MaxSyncHistoryDetailItems = 25;

/** What a sync sent to Bitwarden. */
export interface SyncHistoryDetails {
  userCount: number;
  removedUserCount: number;
  groupCount: number;
  /** Up to MaxSyncHistoryDetailItems emails or names from each list. */
  users: string[];
  removedUsers: string[];
  groups: string[];
  overwriteExisting: boolean;
}

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
  /** What was sent to Bitwarden. Missing for runs that didn't get as far as sending. */
  details?: SyncHistoryDetails;
}
