import { ApiService } from "@/libs/abstractions/api.service";
import { CryptoFunctionService } from "@/libs/abstractions/cryptoFunction.service";
import { DirectoryFactoryService } from "@/libs/abstractions/directory-factory.service";
import { I18nService } from "@/libs/abstractions/i18n.service";
import { MessagingService } from "@/libs/abstractions/messaging.service";
import { StateService } from "@/libs/abstractions/state.service";
import { DirectoryType } from "@/libs/enums/directoryType";
import { GroupEntry } from "@/libs/models/groupEntry";
import { OrganizationImportRequest } from "@/libs/models/request/organizationImportRequest";
import { SyncConfiguration } from "@/libs/models/syncConfiguration";
import { SyncHistoryEntry } from "@/libs/models/syncHistoryEntry";
import { SyncPreview } from "@/libs/models/syncPreview";
import { UserEntry } from "@/libs/models/userEntry";
import { Utils } from "@/libs/utils/utils";

import { BatchRequestBuilder } from "./batch-request-builder";
import { IDirectoryService } from "./directory-services/directory.service";
import { SingleRequestBuilder } from "./single-request-builder";
import { computeSyncPreview } from "./sync-preview";

export interface HashResult {
  hash: string;
  hashLegacy: string;
}

export const batchSize = 2000;

/** Longest error message kept in sync history. */
const MaxHistoryErrorLength = 500;

function describeSyncError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : // ErrorResponse from the Bitwarden API
          ((error as { getSingleMessage?: () => string })?.getSingleMessage?.() ?? String(error));
  return message.length > MaxHistoryErrorLength
    ? message.slice(0, MaxHistoryErrorLength) + "…"
    : message;
}

export class SyncService {
  private dirType: DirectoryType;

  constructor(
    private cryptoFunctionService: CryptoFunctionService,
    private apiService: ApiService,
    private messagingService: MessagingService,
    private i18nService: I18nService,
    private stateService: StateService,
    private batchRequestBuilder: BatchRequestBuilder,
    private singleRequestBuilder: SingleRequestBuilder,
    private directoryFactory: DirectoryFactoryService,
  ) {}

  async sync(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]> {
    const { directoryService, syncConfig } = await this.getDirectory();
    const startingGroupDelta = await this.stateService.getGroupDelta();
    const startingUserDelta = await this.stateService.getUserDelta();
    const now = new Date();
    const history: Pick<SyncHistoryEntry, "userCount" | "groupCount"> = {
      userCount: null,
      groupCount: null,
    };

    this.messagingService.send("dirSyncStarted");
    try {
      let [groups, users] = await this.readEntries(
        directoryService,
        force || syncConfig.overwriteExisting,
        test,
      );
      history.userCount = users?.length ?? 0;
      history.groupCount = groups?.length ?? 0;

      if (
        test ||
        (!syncConfig.overwriteExisting &&
          (groups == null || groups.length === 0) &&
          (users == null || users.length === 0))
      ) {
        if (!test) {
          await this.saveSyncTimes(syncConfig, now);
          await this.recordHistory(now, "noChanges", history);
        }

        this.messagingService.send("dirSyncCompleted", { successfully: true });
        return [groups, users];
      }

      const reqs = this.buildRequest(groups, users, syncConfig);

      const result: HashResult = await this.generateHash(reqs);

      if (result.hash && (await this.isNewHash(result))) {
        for (const req of reqs) {
          await this.apiService.postPublicImportDirectory(req);
        }
        await this.stateService.setLastSyncHash(result.hash);
        await this.recordHistory(now, "success", history);
      } else {
        groups = null;
        users = null;
        await this.recordHistory(now, "noChanges", history);
      }

      await this.saveSyncTimes(syncConfig, now);
      this.messagingService.send("dirSyncCompleted", { successfully: true });
      return [groups, users];
    } catch (e) {
      if (!test) {
        await this.stateService.setGroupDelta(startingGroupDelta);
        await this.stateService.setUserDelta(startingUserDelta);
        await this.recordHistory(now, "failed", history, e);
      }

      this.messagingService.send("dirSyncCompleted", { successfully: false });
      throw e;
    }
  }

  /**
   * Reads the directory the way the next sync would (without saving delta tokens) and compares
   * the result against the organization's current members and groups.
   */
  async preview(): Promise<SyncPreview> {
    const { directoryService, syncConfig } = await this.getDirectory();
    const [groups, users] = await this.readEntries(
      directoryService,
      syncConfig.overwriteExisting,
      true,
    );
    const reqs = this.buildRequest(groups, users, syncConfig);

    const [members, orgGroups] = await Promise.all([
      this.apiService.getPublicMembers(),
      this.apiService.getPublicGroups(),
    ]);

    // Membership is only needed for groups the import would update.
    const importedGroupIds = new Set(reqs.flatMap((r) => r.groups.map((g) => g.externalId)));
    for (const group of orgGroups) {
      if (group.externalId != null && importedGroupIds.has(group.externalId)) {
        group.memberIds = await this.apiService.getPublicGroupMemberIds(group.id);
      }
    }

    return computeSyncPreview(reqs, members, orgGroups);
  }

  /** Checks that the active directory configuration can authenticate. */
  async testConnection(): Promise<void> {
    const { directoryService } = await this.getDirectory();
    await directoryService.testConnection();
  }

  private async getDirectory(): Promise<{
    directoryService: IDirectoryService;
    syncConfig: SyncConfiguration;
  }> {
    this.dirType = await this.stateService.getDirectoryType();
    if (this.dirType == null) {
      throw new Error("No directory configured.");
    }

    const directoryService = this.directoryFactory.createService(this.dirType);
    if (directoryService == null) {
      throw new Error("Cannot load directory service.");
    }

    return { directoryService, syncConfig: await this.stateService.getSync() };
  }

  private async readEntries(
    directoryService: IDirectoryService,
    force: boolean,
    test: boolean,
  ): Promise<[GroupEntry[], UserEntry[]]> {
    const entries = await directoryService.getEntries(force, test);
    const groups = entries[0];
    let users = this.filterUnsupportedUsers(entries[1]);

    if (groups != null && groups.length > 0) {
      this.flattenUsersToGroups(groups, groups);
    }

    users = this.removeDuplicateUsers(users);
    return [groups, users];
  }

  private async recordHistory(
    startedAt: Date,
    status: SyncHistoryEntry["status"],
    counts: Pick<SyncHistoryEntry, "userCount" | "groupCount">,
    error?: unknown,
  ): Promise<void> {
    // History is informational, so never let recording it change the outcome of a sync.
    try {
      await this.stateService.addSyncHistoryEntry({
        startedAt: startedAt.toISOString(),
        durationMs: Date.now() - startedAt.getTime(),
        profileName: await this.getActiveProfileName(),
        status,
        ...counts,
        error: error == null ? undefined : describeSyncError(error),
      });
    } catch {
      // Ignored; see above.
    }
  }

  private async getActiveProfileName(): Promise<string | undefined> {
    const activeId = await this.stateService.getActiveDirectoryProfileId();
    const profiles = await this.stateService.getDirectoryProfiles();
    return profiles?.find((p) => p.id === activeId)?.name;
  }

  async generateHash(reqs: OrganizationImportRequest[]): Promise<HashResult> {
    const reqJson = JSON.stringify(reqs?.length === 1 ? reqs[0] : reqs);
    const orgId = await this.stateService.getOrganizationId();
    if (orgId == null) {
      throw new Error("Organization not set.");
    }

    const apiUrl = await this.stateService.getApiUrl();
    // TODO: Remove hashLegacy once we're sure clients have had time to sync new hashes
    let hashLegacy: string = null;
    const hashBuffLegacy = await this.cryptoFunctionService.hash(apiUrl + reqJson, "sha256");
    if (hashBuffLegacy != null) {
      hashLegacy = Utils.fromBufferToB64(hashBuffLegacy);
    }
    let hash: string = null;
    const hashBuff = await this.cryptoFunctionService.hash(apiUrl + orgId + reqJson, "sha256");
    if (hashBuff != null) {
      hash = Utils.fromBufferToB64(hashBuff);
    }

    return { hash, hashLegacy };
  }

  async isNewHash(hashResult: HashResult): Promise<boolean> {
    const lastHash = await this.stateService.getLastSyncHash();

    return lastHash == null || (hashResult.hash !== lastHash && hashResult.hashLegacy !== lastHash);
  }

  private removeDuplicateUsers(users: UserEntry[]) {
    if (users == null) {
      return null;
    }

    const uniqueUsers = new Array<UserEntry>();
    const processedActiveUsers = new Map<string, string>();
    const processedDeletedUsers = new Map<string, string>();
    const duplicateEmails = new Array<string>();

    // UserEntrys with the same email are ignored if their properties are the same
    // UserEntrys with the same email but different properties will throw an error, unless they are all in a deleted state.
    // A deleted user whose email matches an active user is silently skipped (tombstone of the same user).
    users.forEach((u) => {
      if (processedActiveUsers.has(u.email)) {
        if (!u.deleted && processedActiveUsers.get(u.email) !== JSON.stringify(u)) {
          duplicateEmails.push(u.email);
        }
      } else {
        if (!u.deleted) {
          // Check that active UserEntry does not conflict with a deleted UserEntry
          if (processedDeletedUsers.has(u.email)) {
            duplicateEmails.push(u.email);
          } else {
            processedActiveUsers.set(u.email, JSON.stringify(u));
            uniqueUsers.push(u);
          }
        } else {
          // UserEntrys with duplicate email will not throw an error if they are all deleted. They will be synced.
          processedDeletedUsers.set(u.email, JSON.stringify(u));
          uniqueUsers.push(u);
        }
      }
    });

    if (duplicateEmails.length > 0) {
      const emailsMessage =
        duplicateEmails.length < 4
          ? duplicateEmails.join("\n")
          : duplicateEmails.slice(0, 3).join("\n") +
            "\n" +
            this.i18nService.t("andMore", `${duplicateEmails.length - 3}`);
      throw new Error(this.i18nService.t("duplicateEmails") + "\n" + emailsMessage);
    }

    return uniqueUsers;
  }

  private filterUnsupportedUsers(users: UserEntry[]): UserEntry[] {
    return users == null ? null : users.filter((u) => u.email?.length <= 256);
  }

  private flattenUsersToGroups(
    levelGroups: GroupEntry[],
    allGroups: GroupEntry[],
    visitedGroups?: Set<string>,
  ): Set<string> {
    let allUsers = new Set<string>();
    if (allGroups == null) {
      return allUsers;
    }

    for (const group of levelGroups) {
      const visited = visitedGroups ?? new Set<string>();

      if (visited.has(group.referenceId)) {
        continue;
      }

      visited.add(group.referenceId);

      const childGroups = allGroups.filter((g) => group.groupMemberReferenceIds.has(g.referenceId));
      const childUsers = this.flattenUsersToGroups(childGroups, allGroups, visited);
      childUsers.forEach((id) => group.userMemberExternalIds.add(id));
      allUsers = new Set([...allUsers, ...group.userMemberExternalIds]);
    }
    return allUsers;
  }

  private buildRequest(
    groups: GroupEntry[],
    users: UserEntry[],
    syncConfig: SyncConfiguration,
  ): OrganizationImportRequest[] {
    if (syncConfig.largeImport && (groups?.length ?? 0) + (users?.length ?? 0) > batchSize) {
      return this.batchRequestBuilder.buildRequest(groups, users, syncConfig);
    } else {
      return this.singleRequestBuilder.buildRequest(groups, users, syncConfig);
    }
  }

  private async saveSyncTimes(syncConfig: SyncConfiguration, time: Date) {
    if (syncConfig.groups) {
      await this.stateService.setLastGroupSync(time);
    }
    if (syncConfig.users) {
      await this.stateService.setLastUserSync(time);
    }
  }
}
