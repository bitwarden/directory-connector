import * as https from "https";
import * as querystring from "querystring";

import * as graph from "@microsoft/microsoft-graph-client";
import * as graphType from "@microsoft/microsoft-graph-types";

import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";

import { StateService } from "../../abstractions/state.service";
import { DirectoryType } from "../../enums/directoryType";
import { EntraIdConfiguration } from "../../models/entraIdConfiguration";
import { GroupEntry } from "../../models/groupEntry";
import { SyncConfiguration } from "../../models/syncConfiguration";
import { UserEntry } from "../../models/userEntry";
import { BaseDirectoryService } from "../baseDirectory.service";

import { IDirectoryService } from "./directory.service";

const EntraIdPublicIdentityAuthority = "login.microsoftonline.com";
const EntraIdPublicGraphEndpoint = "https://graph.microsoft.com";
const EntraIdGovernmentIdentityAuthority = "login.microsoftonline.us";
const EntraIdGovernmentGraphEndpoint = "https://graph.microsoft.us";

const NextLink = "@odata.nextLink";
const DeltaLink = "@odata.deltaLink";
const ObjectType = "@odata.type";
const UserSelectParams = "?$select=id,mail,userPrincipalName,displayName,accountEnabled";

enum UserSetType {
  IncludeUser,
  ExcludeUser,
  IncludeGroup,
  ExcludeGroup,
}

export class EntraIdDirectoryService extends BaseDirectoryService implements IDirectoryService {
  private client: graph.Client;
  private dirConfig: EntraIdConfiguration;
  private syncConfig: SyncConfiguration;
  private accessToken: string;
  private accessTokenExpiration: Date;

  constructor(
    private logService: LogService,
    private i18nService: I18nService,
    private stateService: StateService,
  ) {
    super();
    this.init();
  }

  async getEntries(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]> {
    const type = await this.stateService.getDirectoryType();
    if (type !== DirectoryType.EntraID) {
      return;
    }

    this.dirConfig = await this.stateService.getDirectory<EntraIdConfiguration>(
      DirectoryType.EntraID,
    );
    if (this.dirConfig == null) {
      return;
    }

    this.syncConfig = await this.stateService.getSync();
    if (this.syncConfig == null) {
      return;
    }

    let users: UserEntry[];
    if (this.syncConfig.users) {
      users = await this.getCurrentUsers();
      const deletedUsers = await this.getDeletedUsers(force, !test);
      users = users.concat(deletedUsers);
    }

    let groups: GroupEntry[];
    if (this.syncConfig.groups) {
      const setFilter = await this.createAadCustomSet(this.syncConfig.groupFilter);
      groups = await this.getGroups(setFilter);
      users = this.filterUsersFromGroupsSet(users, groups, setFilter, this.syncConfig);
    }

    return [groups, users];
  }

  private async getCurrentUsers(): Promise<UserEntry[]> {
    let entries: UserEntry[] = [];
    let users: graphType.User[];
    const setFilter = this.createCustomUserSet(this.syncConfig.userFilter);
    const userIdsToExclude = new Set<string>();

    // Only get users for the groups provided in includeGroup filter
    if (setFilter != null && setFilter[0] === UserSetType.IncludeGroup) {
      users = await this.getUsersByGroups(setFilter);
      // Get the users in the excludedGroups and filter them out from all users
    } else if (setFilter != null && setFilter[0] === UserSetType.ExcludeGroup) {
      (await this.getUsersByGroups(setFilter)).forEach((user: graphType.User) =>
        userIdsToExclude.add(user.id),
      );
      const userReq = this.client.api("/users" + UserSelectParams);
      users = await this.getUsersByResource(userReq);
    } else {
      const userReq = this.client.api("/users" + UserSelectParams);
      users = await this.getUsersByResource(userReq);
    }
    if (users != null) {
      entries = await this.buildUserEntries(users, userIdsToExclude, setFilter);
    }
    return entries;
  }

  private async getDeletedUsers(force: boolean, saveDelta: boolean): Promise<UserEntry[]> {
    const entryIds = new Set<string>();
    const entries: UserEntry[] = [];

    let res: any = null;
    const token = await this.stateService.getUserDelta();
    if (!force && token != null) {
      try {
        const deltaReq = this.client.api(token);
        res = await deltaReq.get();
      } catch {
        res = null;
      }
    }

    if (res == null) {
      const userReq = this.client.api("/users/delta" + UserSelectParams);
      res = await userReq.get();
    }

    const setFilter = this.createCustomUserSet(this.syncConfig.userFilter);

    while (true) {
      const users: graphType.User[] = res.value;
      if (users != null) {
        for (const user of users) {
          if (user.id == null || entryIds.has(user.id)) {
            continue;
          }
          const entry = this.buildUser(user);
          if (!entry.deleted) {
            continue;
          }

          if (
            setFilter != null &&
            (setFilter[0] === UserSetType.IncludeUser ||
              setFilter[0] === UserSetType.ExcludeUser) &&
            (await this.filterOutUserResult(setFilter, entry))
          ) {
            continue;
          }

          entries.push(entry);
          entryIds.add(user.id);
        }
      }

      if (res[NextLink] == null) {
        if (res[DeltaLink] != null && saveDelta) {
          await this.stateService.setUserDelta(res[DeltaLink]);
        }
        break;
      } else {
        const nextReq = this.client.api(res[NextLink]);
        res = await nextReq.get();
      }
    }

    return entries;
  }

  private async createAadCustomSet(filter: string): Promise<[boolean, Set<string>]> {
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
    let exclude = true;
    if (keyword === "include") {
      exclude = false;
    } else if (keyword === "exclude") {
      exclude = true;
    } else if (keyword === "excludeadministrativeunit") {
      exclude = true;
    } else if (keyword === "includeadministrativeunit") {
      exclude = false;
    } else {
      return null;
    }

    const set = new Set<string>();
    const entryIds = new Set<string>();
    const pieces = parts[1].split(",");

    if (keyword === "excludeadministrativeunit" || keyword === "includeadministrativeunit") {
      for (const p of pieces) {
        let auMembers = await this.client
          .api(`${this.getGraphApiEndpoint()}/v1.0/directory/administrativeUnits/${p}/members`)
          .get();

        while (true) {
          for (const auMember of auMembers.value) {
            const groupId = auMember.id;
            if (auMember["@odata.type"] === "#microsoft.graph.group" && !entryIds.has(groupId)) {
              set.add(auMember.displayName.toLowerCase());
              entryIds.add(groupId);
            }
          }

          if (auMembers[NextLink] == null) {
            break;
          } else {
            const nextLinkReq = this.client.api(auMembers[NextLink]);
            auMembers = await nextLinkReq.get();
          }
        }
      }
    } else {
      for (const p of pieces) {
        set.add(p.trim().toLowerCase());
      }
    }
    return [exclude, set];
  }

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

    const set = new Set<string>();
    const pieces = parts[1].split(",");
    for (const p of pieces) {
      set.add(p.trim().toLowerCase());
    }

    return [userSetType, set];
  }

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

  private buildUser(user: graphType.User): UserEntry {
    const entry = new UserEntry();
    entry.referenceId = user.id;
    entry.externalId = user.id;
    entry.email = user.mail;

    if (
      user.userPrincipalName &&
      (entry.email == null || entry.email === "" || entry.email.indexOf("onmicrosoft.com") > -1)
    ) {
      entry.email = user.userPrincipalName;
    }

    if (entry.email != null) {
      entry.email = entry.email.trim().toLowerCase();
    }

    entry.disabled = user.accountEnabled == null ? false : !user.accountEnabled;

    if ((user as any)["@removed"] != null && (user as any)["@removed"].reason === "changed") {
      entry.deleted = true;
    }

    return entry;
  }

  private async getGroups(setFilter: [boolean, Set<string>]): Promise<GroupEntry[]> {
    const entryIds = new Set<string>();
    const entries: GroupEntry[] = [];
    const groupsReq = this.client.api("/groups");
    let res = await groupsReq.get();

    while (true) {
      const groups: graphType.Group[] = res.value;
      if (groups != null) {
        for (const group of groups) {
          if (group.id == null || entryIds.has(group.id)) {
            continue;
          }
          if (this.filterOutResult(setFilter, group.displayName)) {
            continue;
          }

          const entry = await this.buildGroup(group);
          entries.push(entry);
          entryIds.add(group.id);
        }
      }

      if (res[NextLink] == null) {
        break;
      } else {
        const nextReq = this.client.api(res[NextLink]);
        res = await nextReq.get();
      }
    }

    return entries;
  }

  private async getUsersByResource(usersRequest: graph.GraphRequest) {
    const users: graphType.User[] = [];
    let res = await usersRequest.get();
    res.value.forEach((user: graphType.User) => users.push(user));
    while (res[NextLink] != null) {
      const nextReq = this.client.api(res[NextLink]);
      res = await nextReq.get();
      res.value.forEach((user: graphType.User) => users.push(user));
    }
    return users;
  }

  private async getUsersByGroups(setFilter: [UserSetType, Set<string>]): Promise<graphType.User[]> {
    const users: graphType.User[] = [];
    for (const group of setFilter[1]) {
      const groupUsersReq = this.client.api(
        `/groups/${group}/transitiveMembers` + UserSelectParams,
      );
      users.push(...(await this.getUsersByResource(groupUsersReq)));
    }
    return users;
  }

  private async buildUserEntries(
    users: graphType.User[],
    userIdsToExclude: Set<string>,
    setFilter: [UserSetType, Set<string>],
  ) {
    const entryIds = new Set<string>();
    const entries: UserEntry[] = [];

    for (const user of users) {
      if (user.id == null || entryIds.has(user.id) || userIdsToExclude.has(user.id)) {
        continue;
      }
      const entry = this.buildUser(user);

      if (
        setFilter != null &&
        (setFilter[0] === UserSetType.IncludeUser || setFilter[0] === UserSetType.ExcludeUser) &&
        (await this.filterOutUserResult(setFilter, entry))
      ) {
        continue;
      }
      if (!this.isInvalidUser(entry)) {
        entries.push(entry);
        entryIds.add(user.id);
      }
    }
    return entries;
  }

  private isInvalidUser(user: UserEntry): boolean {
    return !user.disabled && !user.deleted && (user.email == null || user.email.indexOf("#") > -1);
  }

  private async buildGroup(group: graphType.Group): Promise<GroupEntry> {
    const entry = new GroupEntry();
    entry.referenceId = group.id;
    entry.externalId = group.id;
    entry.name = group.displayName;

    const memReq = this.client.api("/groups/" + group.id + "/members");
    let memRes = await memReq.get();

    while (true) {
      const members: any = memRes.value;
      if (members != null) {
        for (const member of members) {
          if (member[ObjectType] === "#microsoft.graph.group") {
            entry.groupMemberReferenceIds.add((member as graphType.Group).id);
          } else if (member[ObjectType] === "#microsoft.graph.user") {
            entry.userMemberExternalIds.add((member as graphType.User).id);
          }
        }
      }
      if (memRes[NextLink] == null) {
        break;
      } else {
        const nextMemReq = this.client.api(memRes[NextLink]);
        memRes = await nextMemReq.get();
      }
    }

    return entry;
  }

  private init() {
    this.client = graph.Client.init({
      authProvider: (done) => {
        if (
          this.dirConfig.applicationId == null ||
          this.dirConfig.key == null ||
          this.dirConfig.tenant == null
        ) {
          done(new Error(this.i18nService.t("dirConfigIncomplete")), null);
          return;
        }

        const identityAuthority =
          this.dirConfig.identityAuthority != null
            ? this.dirConfig.identityAuthority
            : EntraIdPublicIdentityAuthority;
        if (
          identityAuthority !== EntraIdPublicIdentityAuthority &&
          identityAuthority !== EntraIdGovernmentIdentityAuthority
        ) {
          done(new Error(this.i18nService.t("dirConfigIncomplete")), null);
          return;
        }

        if (!this.accessTokenIsExpired()) {
          done(null, this.accessToken);
          return;
        }

        this.accessToken = null;
        this.accessTokenExpiration = null;

        const data = querystring.stringify({
          client_id: this.dirConfig.applicationId,
          client_secret: this.dirConfig.key,
          grant_type: "client_credentials",
          scope: `${this.getGraphApiEndpoint()}/.default`,
        });

        const req = https
          .request(
            {
              host: identityAuthority,
              path: "/" + this.dirConfig.tenant + "/oauth2/v2.0/token",
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(data),
              },
            },
            (res) => {
              res.setEncoding("utf8");
              res.on("data", (chunk: string) => {
                const d = JSON.parse(chunk);
                if (res.statusCode === 200 && d.access_token != null) {
                  this.setAccessTokenExpiration(d.access_token, d.expires_in);
                  done(null, d.access_token);
                } else if (d.error != null && d.error_description != null) {
                  const shortError = d.error_description?.split("\n", 1)[0];
                  const err = new Error(d.error + " (" + res.statusCode + "): " + shortError);
                  // eslint-disable-next-line
                  console.error(d.error_description);
                  done(err, null);
                } else {
                  const err = new Error("Unknown error (" + res.statusCode + ").");
                  done(err, null);
                }
              });
            },
          )
          .on("error", (err) => {
            done(err, null);
          });

        req.write(data);
        req.end();
      },
    });
  }

  private accessTokenIsExpired() {
    if (this.accessToken == null || this.accessTokenExpiration == null) {
      return true;
    }

    // expired if less than 2 minutes til expiration
    const now = new Date();
    return this.accessTokenExpiration.getTime() - now.getTime() < 120000;
  }

  private setAccessTokenExpiration(accessToken: string, expSeconds: number) {
    if (accessToken == null || expSeconds == null) {
      return;
    }

    this.accessToken = accessToken;
    const exp = new Date();
    exp.setSeconds(exp.getSeconds() + expSeconds);
    this.accessTokenExpiration = exp;
  }

  private getGraphApiEndpoint(): string {
    return this.dirConfig.identityAuthority === EntraIdGovernmentIdentityAuthority
      ? EntraIdGovernmentGraphEndpoint
      : EntraIdPublicGraphEndpoint;
  }
}
