import { JWT } from "google-auth-library";
import { admin_directory_v1, google } from "googleapis";

import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";

import { StateService } from "../../abstractions/state.service";
import { DirectoryType } from "../../enums/directoryType";
import { GroupEntry } from "../../models/groupEntry";
import { GSuiteConfiguration } from "../../models/gsuiteConfiguration";
import { SyncConfiguration } from "../../models/syncConfiguration";
import { UserEntry } from "../../models/userEntry";
import { BaseDirectoryService } from "../baseDirectory.service";

import { IDirectoryService } from "./directory.service";

export class GSuiteDirectoryService extends BaseDirectoryService implements IDirectoryService {
  private client: JWT;
  private service: admin_directory_v1.Admin;
  private authParams: any;
  private dirConfig: GSuiteConfiguration;
  private syncConfig: SyncConfiguration;

  constructor(
    private logService: LogService,
    private i18nService: I18nService,
    private stateService: StateService,
  ) {
    super();
    this.service = google.admin("directory_v1");
  }

  async getEntries(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]> {
    const type = await this.stateService.getDirectoryType();
    if (type !== DirectoryType.GSuite) {
      return;
    }

    this.dirConfig = await this.stateService.getDirectory<GSuiteConfiguration>(
      DirectoryType.GSuite,
    );
    if (this.dirConfig == null) {
      return;
    }

    this.syncConfig = await this.stateService.getSync();
    if (this.syncConfig == null) {
      return;
    }

    await this.auth();

    let users: UserEntry[] = [];
    if (this.syncConfig.users) {
      users = await this.getUsers();
    }

    let groups: GroupEntry[];
    if (this.syncConfig.groups) {
      const setFilter = this.createCustomSet(this.syncConfig.groupFilter);
      groups = await this.getGroups(setFilter, users);
      users = this.filterUsersFromGroupsSet(users, groups, setFilter, this.syncConfig);
    }

    return [groups, users];
  }

  private async getUsers(): Promise<UserEntry[]> {
    const entries: UserEntry[] = [];
    const query = this.createDirectoryQuery(this.syncConfig.userFilter);
    let nextPageToken: string = null;

    const filter = this.createCustomSet(this.syncConfig.userFilter);
    // eslint-disable-next-line
    while (true) {
      this.logService.info("Querying users - nextPageToken:" + nextPageToken);
      const p = Object.assign({ query: query, pageToken: nextPageToken }, this.authParams);
      const res = await this.service.users.list(p);
      if (res.status !== 200) {
        throw new Error("User list API failed: " + res.statusText);
      }

      nextPageToken = res.data.nextPageToken;
      if (res.data.users != null) {
        for (const user of res.data.users) {
          if (this.filterOutResult(filter, user.primaryEmail)) {
            continue;
          }
          const entry = this.buildUser(user, false);
          if (entry != null) {
            entries.push(entry);
          }
        }
      }

      if (nextPageToken == null) {
        break;
      }
    }

    nextPageToken = null;
    // eslint-disable-next-line
    while (true) {
      this.logService.info("Querying deleted users - nextPageToken:" + nextPageToken);
      const p = Object.assign(
        { showDeleted: true, query: query, pageToken: nextPageToken },
        this.authParams,
      );
      const delRes = await this.service.users.list(p);
      if (delRes.status !== 200) {
        throw new Error("Deleted user list API failed: " + delRes.statusText);
      }

      nextPageToken = delRes.data.nextPageToken;
      if (delRes.data.users != null) {
        for (const user of delRes.data.users) {
          if (this.filterOutResult(filter, user.primaryEmail)) {
            continue;
          }
          const entry = this.buildUser(user, true);
          if (entry != null) {
            entries.push(entry);
          }
        }
      }

      if (nextPageToken == null) {
        break;
      }
    }

    return entries;
  }

  private buildUser(user: admin_directory_v1.Schema$User, deleted: boolean) {
    if ((user.emails == null || user.emails === "") && !deleted) {
      return null;
    }

    const entry = new UserEntry();
    entry.referenceId = user.id;
    entry.externalId = user.id;
    entry.email = user.primaryEmail != null ? user.primaryEmail.trim().toLowerCase() : null;
    entry.disabled = user.suspended || user.archived || false;
    entry.deleted = deleted;
    return entry;
  }

  private async getGroups(
    setFilter: [boolean, Set<string>],
    users: UserEntry[],
  ): Promise<GroupEntry[]> {
    const entries: GroupEntry[] = [];
    const query = this.createDirectoryQuery(this.syncConfig.groupFilter);
    let nextPageToken: string = null;

    // eslint-disable-next-line
    while (true) {
      this.logService.info("Querying groups - nextPageToken:" + nextPageToken);
      let p = null;
      if (query == null) {
        p = Object.assign({ pageToken: nextPageToken }, this.authParams);
      } else {
        p = Object.assign({ query: query, pageToken: nextPageToken }, this.authParams);
      }
      const res = await this.service.groups.list(p);
      if (res.status !== 200) {
        throw new Error("Group list API failed: " + res.statusText);
      }

      nextPageToken = res.data.nextPageToken;
      if (res.data.groups != null) {
        for (const group of res.data.groups) {
          if (!this.filterOutResult(setFilter, group.name)) {
            const entry = await this.buildGroup(group, users);
            entries.push(entry);
          }
        }
      }

      if (nextPageToken == null) {
        break;
      }
    }

    return entries;
  }

  private async buildGroup(group: admin_directory_v1.Schema$Group, users: UserEntry[]) {
    let nextPageToken: string = null;

    const entry = new GroupEntry();
    entry.referenceId = group.id;
    entry.externalId = group.id;
    entry.name = group.name;

    // eslint-disable-next-line
    while (true) {
      const p = Object.assign({ groupKey: group.id, pageToken: nextPageToken }, this.authParams);
      const memRes = await this.service.members.list(p);
      if (memRes.status !== 200) {
        throw new Error("Group member list API failed: " + memRes.statusText);
      }

      nextPageToken = memRes.data.nextPageToken;
      if (memRes.data.members != null) {
        for (const member of memRes.data.members) {
          if (member.type == null) {
            continue;
          }
          const type = member.type.toLowerCase();
          if (type === "user") {
            if (member.status == null || member.status.toLowerCase() !== "active") {
              continue;
            }
            entry.userMemberExternalIds.add(member.id);
          } else if (type === "group") {
            entry.groupMemberReferenceIds.add(member.id);
          } else if (type === "customer") {
            for (const user of users) {
              entry.userMemberExternalIds.add(user.externalId);
            }
          }
        }
      }

      if (nextPageToken == null) {
        break;
      }
    }

    return entry;
  }

  private async auth() {
    if (
      this.dirConfig.clientEmail == null ||
      this.dirConfig.privateKey == null ||
      this.dirConfig.adminUser == null ||
      this.dirConfig.domain == null
    ) {
      throw new Error(this.i18nService.t("dirConfigIncomplete"));
    }

    this.client = new google.auth.JWT({
      email: this.dirConfig.clientEmail,
      key: this.dirConfig.privateKey != null ? this.dirConfig.privateKey.trimLeft() : null,
      subject: this.dirConfig.adminUser,
      scopes: [
        "https://www.googleapis.com/auth/admin.directory.user.readonly",
        "https://www.googleapis.com/auth/admin.directory.group.readonly",
        "https://www.googleapis.com/auth/admin.directory.group.member.readonly",
      ],
    });

    try {
      await this.client.authorize();
    } catch (error) {
      // Catch and rethrow this to sanitize any sensitive info (e.g. private key) in the error message
      this.logService.error(
        `Google Workspace authentication failed: ${error?.name || "Unknown error"}`,
      );
      throw new Error(this.i18nService.t("authenticationFailed"));
    }

    this.authParams = {
      auth: this.client,
    };
    if (this.dirConfig.domain != null && this.dirConfig.domain.trim() !== "") {
      this.authParams.domain = this.dirConfig.domain;
    }
    if (this.dirConfig.customer != null && this.dirConfig.customer.trim() !== "") {
      this.authParams.customer = this.dirConfig.customer;
    }
  }
}
