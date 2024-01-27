import { ApiService } from "@/jslib/common/src/abstractions/api.service";
import { CryptoFunctionService } from "@/jslib/common/src/abstractions/cryptoFunction.service";
import { EnvironmentService } from "@/jslib/common/src/abstractions/environment.service";
import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { Utils } from "@/jslib/common/src/misc/utils";
import { OrganizationImportRequest } from "@/jslib/common/src/models/request/organizationImportRequest";

import { StateService } from "../abstractions/state.service";
import { DirectoryType } from "../enums/directoryType";
import { GroupEntry } from "../models/groupEntry";
import { SyncConfiguration } from "../models/syncConfiguration";
import { UserEntry } from "../models/userEntry";

import { AzureDirectoryService } from "./azure-directory.service";
import { IDirectoryService } from "./directory.service";
import { GSuiteDirectoryService } from "./gsuite-directory.service";
import { LdapDirectoryService } from "./ldap-directory.service";
import { OktaDirectoryService } from "./okta-directory.service";
import { OneLoginDirectoryService } from "./onelogin-directory.service";

export class SyncService {
  private dirType: DirectoryType;

  constructor(
    private logService: LogService,
    private cryptoFunctionService: CryptoFunctionService,
    private apiService: ApiService,
    private messagingService: MessagingService,
    private i18nService: I18nService,
    private environmentService: EnvironmentService,
    private stateService: StateService,
  ) {}

  async sync(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]> {
    this.dirType = await this.stateService.getDirectoryType();
    if (this.dirType == null) {
      throw new Error("No directory configured.");
    }

    const directoryService = this.getDirectoryService();
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

      const req = this.buildRequest(
        groups,
        users,
        syncConfig.removeDisabled,
        syncConfig.overwriteExisting,
        syncConfig.largeImport,
      );
      const reqJson = JSON.stringify(req);

      const orgId = await this.stateService.getOrganizationId();
      if (orgId == null) {
        throw new Error("Organization not set.");
      }

      // TODO: Remove hashLegacy once we're sure clients have had time to sync new hashes
      let hashLegacy: string = null;
      const hashBuffLegacy = await this.cryptoFunctionService.hash(
        this.environmentService.getApiUrl() + reqJson,
        "sha256",
      );
      if (hashBuffLegacy != null) {
        hashLegacy = Utils.fromBufferToB64(hashBuffLegacy);
      }
      let hash: string = null;
      const hashBuff = await this.cryptoFunctionService.hash(
        this.environmentService.getApiUrl() + orgId + reqJson,
        "sha256",
      );
      if (hashBuff != null) {
        hash = Utils.fromBufferToB64(hashBuff);
      }
      const lastHash = await this.stateService.getLastSyncHash();

      if (lastHash == null || (hash !== lastHash && hashLegacy !== lastHash)) {
        await this.apiService.postPublicImportDirectory(req);
        await this.stateService.setLastSyncHash(hash);
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

  private flattenUsersToGroups(levelGroups: GroupEntry[], allGroups: GroupEntry[]): Set<string> {
    let allUsers = new Set<string>();
    if (allGroups == null) {
      return allUsers;
    }
    for (const group of levelGroups) {
      const childGroups = allGroups.filter((g) => group.groupMemberReferenceIds.has(g.referenceId));
      const childUsers = this.flattenUsersToGroups(childGroups, allGroups);
      childUsers.forEach((id) => group.userMemberExternalIds.add(id));
      allUsers = new Set([...allUsers, ...group.userMemberExternalIds]);
    }
    return allUsers;
  }

  private getDirectoryService(): IDirectoryService {
    switch (this.dirType) {
      case DirectoryType.GSuite:
        return new GSuiteDirectoryService(this.logService, this.i18nService, this.stateService);
      case DirectoryType.AzureActiveDirectory:
        return new AzureDirectoryService(this.logService, this.i18nService, this.stateService);
      case DirectoryType.Ldap:
        return new LdapDirectoryService(this.logService, this.i18nService, this.stateService);
      case DirectoryType.Okta:
        return new OktaDirectoryService(this.logService, this.i18nService, this.stateService);
      case DirectoryType.OneLogin:
        return new OneLoginDirectoryService(this.logService, this.i18nService, this.stateService);
      default:
        return null;
    }
  }

  private buildRequest(
    groups: GroupEntry[],
    users: UserEntry[],
    removeDisabled: boolean,
    overwriteExisting: boolean,
    largeImport = false,
  ) {
    return new OrganizationImportRequest({
      groups: (groups ?? []).map((g) => {
        return {
          name: g.name,
          externalId: g.externalId,
          memberExternalIds: Array.from(g.userMemberExternalIds),
        };
      }),
      users: (users ?? []).map((u) => {
        return {
          email: u.email,
          externalId: u.externalId,
          deleted: u.deleted || (removeDisabled && u.disabled),
        };
      }),
      overwriteExisting: overwriteExisting,
      largeImport: largeImport,
    });
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
