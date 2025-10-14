import { JWT } from "google-auth-library";
import { admin_directory_v1, google } from "googleapis";

import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";

import { StateService } from "../abstractions/state.service";
import { DirectoryType } from "../enums/directoryType";
import { GroupEntry } from "../models/groupEntry";
import { GSuiteConfiguration } from "../models/gsuiteConfiguration";
import { SyncConfiguration } from "../models/syncConfiguration";
import { UserEntry } from "../models/userEntry";

import { BaseDirectoryService } from "./baseDirectory.service";
import { IDirectoryService } from "./directory.service";

enum UserSetType {
  IncludeUser,
  ExcludeUser,
  IncludeGroup,
  ExcludeGroup,
}

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
    let entries: UserEntry[] = [];
    let users: admin_directory_v1.Schema$User[];
    const setFilter = this.createCustomUserSet(this.syncConfig.userFilter);
    const userIdsToExclude = new Set<string>();

    // Only get users for the groups provided in includeGroup filter
    if (setFilter != null && setFilter[0] === UserSetType.IncludeGroup) {
      users = await this.getUsersByGroups(setFilter);
    } else if (setFilter != null && setFilter[0] === UserSetType.ExcludeGroup) {
      // For excludeGroup, fetch users from excluded groups and add their IDs to exclusion set
      // Then fetch all users and filter them out during buildUserEntries
      (await this.getUsersByGroups(setFilter)).forEach((user: admin_directory_v1.Schema$User) =>
        userIdsToExclude.add(user.id),
      );
      users = await this.getAllUsers();
    } else {
      users = await this.getAllUsers();
    }
    if (users != null) {
      entries = await this.buildUserEntries(users, userIdsToExclude, setFilter);
    }

    const deletedUsers = await this.getDeletedUsers(setFilter);
    entries = entries.concat(deletedUsers);

    return entries;
  }

  /**
   * Fetches all users from the Google Workspace domain.
   * Applies any Google Directory API query filters if present in the user filter.
   *
   * @returns Array of all Google Workspace users in the domain
   */
  private async getAllUsers(): Promise<admin_directory_v1.Schema$User[]> {
    const users: admin_directory_v1.Schema$User[] = [];
    const query = this.createDirectoryQuery(this.syncConfig.userFilter);
    let nextPageToken: string = null;

    // eslint-disable-next-line
    while (true) {
      this.logService.info("Querying users - nextPageToken:" + nextPageToken);
      // Only include query parameter if it's valid (avoids 400 errors for includeGroup/excludeGroup filters)
      let p = null;
      if (query == null) {
        p = Object.assign({ pageToken: nextPageToken }, this.authParams);
      } else {
        p = Object.assign({ query: query, pageToken: nextPageToken }, this.authParams);
      }
      const res = await this.service.users.list(p);
      if (res.status !== 200) {
        throw new Error("User list API failed: " + res.statusText);
      }

      nextPageToken = res.data.nextPageToken;
      if (res.data.users != null) {
        users.push(...res.data.users);
      }

      if (nextPageToken == null) {
        break;
      }
    }

    return users;
  }

  /**
   * Fetches deleted users from the Google Workspace domain.
   * Applies include/exclude user filters if present.
   *
   * @param setFilter Optional filter for include/exclude users
   * @returns Array of UserEntry objects representing deleted users
   */
  private async getDeletedUsers(setFilter: [UserSetType, Set<string>]): Promise<UserEntry[]> {
    const entries: UserEntry[] = [];
    const query = this.createDirectoryQuery(this.syncConfig.userFilter);
    let nextPageToken: string = null;

    // eslint-disable-next-line
    while (true) {
      this.logService.info("Querying deleted users - nextPageToken:" + nextPageToken);
      // Only include query parameter if it's valid (avoids 400 errors for includeGroup/excludeGroup filters)
      let p = null;
      if (query == null) {
        p = Object.assign({ showDeleted: true, pageToken: nextPageToken }, this.authParams);
      } else {
        p = Object.assign(
          { showDeleted: true, query: query, pageToken: nextPageToken },
          this.authParams,
        );
      }
      const delRes = await this.service.users.list(p);
      if (delRes.status !== 200) {
        throw new Error("Deleted user list API failed: " + delRes.statusText);
      }

      nextPageToken = delRes.data.nextPageToken;
      if (delRes.data.users != null) {
        for (const user of delRes.data.users) {
          const entry = this.buildUser(user, true);

          if (
            setFilter != null &&
            (setFilter[0] === UserSetType.IncludeUser ||
              setFilter[0] === UserSetType.ExcludeUser) &&
            (await this.filterOutUserResult(setFilter, entry))
          ) {
            continue;
          }

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

  /**
   * Parses the user filter to extract custom set filters for include/exclude users or groups.
   * Supports filter formats:
   * - include:user1@domain.com,user2@domain.com
   * - exclude:user1@domain.com
   * - includeGroup:GroupName1,GroupName2
   * - excludeGroup:GroupName1
   *
   * @param filter The user filter string
   * @returns A tuple of [UserSetType, Set<string>] or null if no valid filter found
   */
  private createCustomUserSet(filter: string): [UserSetType, Set<string>] {
    if (filter == null || filter === "") {
      return null;
    }

    const mainParts = filter.split("|");
    if (mainParts.length < 1 || mainParts[0] == null || mainParts[0].trim() === "") {
      return null;
    }

    const parts = mainParts[0].split(":");
    if (parts.length !== 2) {
      return null;
    }

    const keyword = parts[0].trim().toLowerCase();
    let userSetType = UserSetType.IncludeUser;
    if (keyword === "include") {
      userSetType = UserSetType.IncludeUser;
    } else if (keyword === "exclude") {
      userSetType = UserSetType.ExcludeUser;
    } else if (keyword === "includegroup") {
      userSetType = UserSetType.IncludeGroup;
    } else if (keyword === "excludegroup") {
      userSetType = UserSetType.ExcludeGroup;
    } else {
      return null;
    }

    // Parse comma-separated values and normalize to lowercase for case-insensitive matching
    const set = new Set<string>();
    const pieces = parts[1].split(",");
    for (const p of pieces) {
      set.add(p.trim().toLowerCase());
    }

    return [userSetType, set];
  }

  /**
   * Fetches users that are members of the specified groups.
   * Retrieves all groups from the domain and filters by name to find matching groups,
   * then fetches all active user members from those groups.
   *
   * @param setFilter Tuple containing UserSetType and Set of group names to match
   * @returns Array of Google Workspace users from the matching groups
   */
  private async getUsersByGroups(
    setFilter: [UserSetType, Set<string>],
  ): Promise<admin_directory_v1.Schema$User[]> {
    const users: admin_directory_v1.Schema$User[] = [];
    const matchingGroups: admin_directory_v1.Schema$Group[] = [];

    // Fetch all groups and filter by name in code
    let nextPageToken: string = null;
    // eslint-disable-next-line
    while (true) {
      this.logService.info("Querying all groups - nextPageToken:" + nextPageToken);
      const groupsRes = await this.service.groups.list(
        Object.assign({ pageToken: nextPageToken }, this.authParams),
      );

      if (groupsRes.status !== 200) {
        throw new Error("Group list API failed: " + groupsRes.statusText);
      }

      nextPageToken = groupsRes.data.nextPageToken;
      if (groupsRes.data.groups != null) {
        for (const group of groupsRes.data.groups) {
          // Match group name case-insensitively against the filter set
          if (setFilter[1].has(group.name.trim().toLowerCase())) {
            matchingGroups.push(group);
          }
        }
      }

      if (nextPageToken == null) {
        break;
      }
    }

    // Fetch members from matching groups
    for (const group of matchingGroups) {
      this.logService.info("Fetching members for group: " + group.name);
      let memberPageToken: string = null;
      // eslint-disable-next-line
      while (true) {
        const membersRes = await this.service.members.list(
          Object.assign({ groupKey: group.id, pageToken: memberPageToken }, this.authParams),
        );

        if (membersRes.status !== 200) {
          this.logService.warning("Member list failed for group: " + group.name);
          break;
        }

        memberPageToken = membersRes.data.nextPageToken;
        if (membersRes.data.members != null) {
          for (const member of membersRes.data.members) {
            if (member.type == null || member.type.toLowerCase() !== "user") {
              continue;
            }
            if (member.status != null && member.status.toLowerCase() !== "active") {
              continue;
            }

            const userRes = await this.service.users.get(
              Object.assign({ userKey: member.id }, this.authParams),
            );

            if (userRes.status === 200 && userRes.data != null) {
              users.push(userRes.data);
            }
          }
        }

        if (memberPageToken == null) {
          break;
        }
      }
    }
    return users;
  }

  /**
   * Builds UserEntry objects from Google Workspace users with filtering and deduplication.
   * Filters out excluded users and applies include/exclude user filters if present.
   *
   * @param users Array of Google Workspace users to process
   * @param userIdsToExclude Set of user IDs to exclude (e.g., from excludeGroup filter)
   * @param setFilter Optional filter for include/exclude users
   * @returns Array of UserEntry objects
   */
  private async buildUserEntries(
    users: admin_directory_v1.Schema$User[],
    userIdsToExclude: Set<string>,
    setFilter: [UserSetType, Set<string>],
  ) {
    const entryIds = new Set<string>();
    const entries: UserEntry[] = [];

    for (const user of users) {
      if (user.id == null || entryIds.has(user.id) || userIdsToExclude.has(user.id)) {
        continue;
      }
      const entry = this.buildUser(user, false);

      if (
        setFilter != null &&
        (setFilter[0] === UserSetType.IncludeUser || setFilter[0] === UserSetType.ExcludeUser) &&
        (await this.filterOutUserResult(setFilter, entry))
      ) {
        continue;
      }
      if (entry != null) {
        entries.push(entry);
        entryIds.add(user.id);
      }
    }
    return entries;
  }

  /**
   * Determines if a user should be filtered out based on include/exclude user filters.
   * Only applies to IncludeUser and ExcludeUser filters (not group-based filters).
   *
   * @param setFilter The filter containing UserSetType and set of user emails
   * @param user The UserEntry to check
   * @returns True if the user should be filtered out, false otherwise
   */
  private async filterOutUserResult(
    setFilter: [UserSetType, Set<string>],
    user: UserEntry,
  ): Promise<boolean> {
    if (setFilter == null) {
      return false;
    }

    let userSetTypeExclude = null;
    if (setFilter[0] === UserSetType.IncludeUser) {
      userSetTypeExclude = false;
    } else if (setFilter[0] === UserSetType.ExcludeUser) {
      userSetTypeExclude = true;
    }

    if (userSetTypeExclude != null) {
      return this.filterOutResult([userSetTypeExclude, setFilter[1]], user.email);
    }

    return false;
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

    await this.client.authorize();

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
