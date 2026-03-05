import { ApiService } from "@/jslib/common/src/abstractions/api.service";
import { CryptoFunctionService } from "@/jslib/common/src/abstractions/cryptoFunction.service";
import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { Utils } from "@/jslib/common/src/misc/utils";
import { OrganizationImportRequest } from "@/jslib/common/src/models/request/organizationImportRequest";

import { DirectoryFactoryService } from "../abstractions/directory-factory.service";
import { StateService } from "../abstractions/state.service";
import { DirectoryType } from "../enums/directoryType";
import { GroupEntry } from "../models/groupEntry";
import { SyncConfiguration } from "../models/syncConfiguration";
import { UserEntry } from "../models/userEntry";

import { BatchRequestBuilder } from "./batch-request-builder";
import { SingleRequestBuilder } from "./single-request-builder";

export interface HashResult {
  hash: string;
  hashLegacy: string;
}

export const batchSize = 2000;

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
    this.dirType = await this.stateService.getDirectoryType();
    if (this.dirType == null) {
      throw new Error("No directory configured.");
    }

    const directoryService = this.directoryFactory.createService(this.dirType);
    if (directoryService == null) {
      throw new Error("Cannot load directory service.");
    }

    const syncConfig = await this.stateService.getSync();
    const startingGroupDelta = await this.stateService.getGroupDelta();
    const startingUserDelta = await this.stateService.getUserDelta();
    const now = new Date();

    this.messagingService.send("dirSyncStarted");
    try {
      const entries = await directoryService.getEntries(
        force || syncConfig.overwriteExisting,
        test,
      );
      let groups = entries[0];
      let users = this.filterUnsupportedUsers(entries[1]);

      if (groups != null && groups.length > 0) {
        this.flattenUsersToGroups(groups, groups);
      }

      users = this.removeDuplicateUsers(users);

      if (
        test ||
        (!syncConfig.overwriteExisting &&
          (groups == null || groups.length === 0) &&
          (users == null || users.length === 0))
      ) {
        if (!test) {
          await this.saveSyncTimes(syncConfig, now);
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
      } else {
        groups = null;
        users = null;
      }

      await this.saveSyncTimes(syncConfig, now);
      this.messagingService.send("dirSyncCompleted", { successfully: true });
      return [groups, users];
    } catch (e) {
      if (!test) {
        await this.stateService.setGroupDelta(startingGroupDelta);
        await this.stateService.setUserDelta(startingUserDelta);
      }

      this.messagingService.send("dirSyncCompleted", { successfully: false });
      throw e;
    }
  }

  async generateHash(reqs: OrganizationImportRequest[]): Promise<HashResult> {
    const reqJson = JSON.stringify(reqs?.length === 1 ? reqs[0] : reqs);
    const orgId = await this.stateService.getOrganizationId();
    if (orgId == null) {
      throw new Error("Organization not set.");
    }

    // TODO: Remove hashLegacy once we're sure clients have had time to sync new hashes
    const apiUrl = await this.stateService.getApiUrl();
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
    users.forEach((u) => {
      if (processedActiveUsers.has(u.email)) {
        if (processedActiveUsers.get(u.email) !== JSON.stringify(u)) {
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
