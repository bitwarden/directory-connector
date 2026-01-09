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

/**
 * Google Workspace (formerly G Suite) Directory Service
 *
 * This service integrates with Google Workspace to synchronize users and groups
 * to Bitwarden organizations using the Google Admin SDK Directory API.
 *
 * @remarks
 * Authentication is performed using a service account with domain-wide delegation.
 * The service account must be granted the following OAuth 2.0 scopes:
 * - https://www.googleapis.com/auth/admin.directory.user.readonly
 * - https://www.googleapis.com/auth/admin.directory.group.readonly
 * - https://www.googleapis.com/auth/admin.directory.group.member.readonly
 *
 * @see {@link https://developers.google.com/admin-sdk/directory/v1/guides | Google Admin SDK Directory API}
 * @see {@link https://support.google.com/a/answer/162106 | Domain-wide delegation of authority}
 */
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

  /**
   * Retrieves users and groups from Google Workspace directory
   * @returns A tuple containing [groups, users] arrays
   *
   * @remarks
   * This function:
   * 1. Validates the directory type matches GSuite
   * 2. Loads directory and sync configuration
   * 3. Authenticates with Google Workspace using service account credentials
   * 4. Retrieves users (if enabled in sync config)
   * 5. Retrieves groups and their members (if enabled in sync config)
   * 6. Applies any user/group filters specified in sync configuration
   *
   * User and group filters follow Google Workspace Directory API query syntax:
   * - Use `|` prefix for custom filters (e.g., "|orgUnitPath='/Engineering'")
   * - Multiple conditions can be combined with AND/OR operators
   *
   * @example
   * ```typescript
   * const [groups, users] = await service.getEntries(true, false);
   * console.log(`Synced ${users.length} users and ${groups.length} groups`);
   * ```
   */
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

  /**
   * Retrieves all users from Google Workspace directory
   *
   * @returns Array of UserEntry objects representing users in the directory
   *
   * @remarks
   * This method performs two separate queries:
   * 1. Active users (including suspended and archived)
   * 2. Deleted users (marked with deleted flag)
   *
   * The method handles pagination automatically, fetching all pages of results.
   * Users are filtered based on the userFilter specified in sync configuration.
   *
   * User properties mapped:
   * - referenceId: User's unique Google ID
   * - externalId: User's unique Google ID (same as referenceId)
   * - email: User's primary email address (lowercase)
   * - disabled: True if user is suspended or archived
   * - deleted: True if user is deleted from the directory
   */
  private async getUsers(): Promise<UserEntry[]> {
    const entries: UserEntry[] = [];
    const query = this.createDirectoryQuery(this.syncConfig.userFilter);
    let nextPageToken: string = null;

    const filter = this.createCustomSet(this.syncConfig.userFilter);

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

  /**
   * Transforms a Google Workspace user object into a UserEntry
   *
   * @param user - Google Workspace user object from the API
   * @param deleted - Whether this user is from the deleted users list
   * @returns UserEntry object or null if user data is invalid
   */
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

  /**
   * Retrieves all groups from Google Workspace directory
   *
   * @param setFilter - Tuple of [isWhitelist, Set<string>] for filtering groups
   * @param users - Array of UserEntry objects to reference when processing members
   * @returns Array of GroupEntry objects representing groups in the directory
   *
   * @remarks
   * For each group, the method also retrieves all group members by calling the
   * members API. Groups are filtered based on the groupFilter in sync configuration.
   */
  private async getGroups(
    setFilter: [boolean, Set<string>],
    users: UserEntry[],
  ): Promise<GroupEntry[]> {
    const entries: GroupEntry[] = [];
    const query = this.createDirectoryQuery(this.syncConfig.groupFilter);
    let nextPageToken: string = null;

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

  /**
   * Transforms a Google Workspace group object into a GroupEntry with members
   *
   * @param group - Google Workspace group object from the API
   * @param users - Array of UserEntry objects for reference
   * @returns GroupEntry object with all members populated
   *
   * @remarks
   * This method retrieves all members of the group, handling three member types:
   * - USER: Individual user members (only active status users are included)
   * - GROUP: Nested group members
   * - CUSTOMER: Special type that includes all users in the domain
   */
  private async buildGroup(group: admin_directory_v1.Schema$Group, users: UserEntry[]) {
    let nextPageToken: string = null;

    const entry = new GroupEntry();
    entry.referenceId = group.id;
    entry.externalId = group.id;
    entry.name = group.name;

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
   * Authenticates with Google Workspace using service account credentials
   *
   * @throws Error if required configuration fields are missing or authentication fails
   *
   * @remarks
   * Authentication uses a JWT with the following required fields:
   * - clientEmail: Service account email address
   * - privateKey: Service account private key (PEM format)
   * - subject: Admin user email to impersonate (for domain-wide delegation)
   *
   * The service account must be configured with domain-wide delegation and granted
   * the required OAuth scopes in the Google Workspace Admin Console.
   *
   * Optional configuration:
   * - domain: Filters results to a specific domain
   * - customer: Customer ID for multi-domain organizations
   *
   * @see {@link https://developers.google.com/identity/protocols/oauth2/service-account | Service account authentication}
   */
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
