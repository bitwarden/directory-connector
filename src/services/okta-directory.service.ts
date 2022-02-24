import * as https from "https";

import { I18nService } from "jslib-common/abstractions/i18n.service";
import { LogService } from "jslib-common/abstractions/log.service";

import { StateService } from "../abstractions/state.service";
import { DirectoryType } from "../enums/directoryType";
import { GroupEntry } from "../models/groupEntry";
import { OktaConfiguration } from "../models/oktaConfiguration";
import { SyncConfiguration } from "../models/syncConfiguration";
import { UserEntry } from "../models/userEntry";

import { BaseDirectoryService } from "./baseDirectory.service";
import { IDirectoryService } from "./directory.service";

const DelayBetweenBuildGroupCallsInMilliseconds = 500;

export class OktaDirectoryService extends BaseDirectoryService implements IDirectoryService {
  private dirConfig: OktaConfiguration;
  private syncConfig: SyncConfiguration;
  private lastBuildGroupCall: number;

  constructor(
    private logService: LogService,
    private i18nService: I18nService,
    private stateService: StateService
  ) {
    super();
  }

  async getEntries(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]> {
    const type = await this.stateService.getDirectoryType();
    if (type !== DirectoryType.Okta) {
      return;
    }

    this.dirConfig = await this.stateService.getDirectory<OktaConfiguration>(DirectoryType.Okta);
    if (this.dirConfig == null) {
      return;
    }

    this.syncConfig = await this.stateService.getSync();
    if (this.syncConfig == null) {
      return;
    }

    if (this.dirConfig.orgUrl == null || this.dirConfig.token == null) {
      throw new Error(this.i18nService.t("dirConfigIncomplete"));
    }

    let users: UserEntry[];
    if (this.syncConfig.users) {
      users = await this.getUsers(force);
    }

    let groups: GroupEntry[];
    if (this.syncConfig.groups) {
      const setFilter = this.createCustomSet(this.syncConfig.groupFilter);
      groups = await this.getGroups(this.forceGroup(force, users), setFilter);
      users = this.filterUsersFromGroupsSet(users, groups, setFilter, this.syncConfig);
    }

    return [groups, users];
  }

  private async getUsers(force: boolean): Promise<UserEntry[]> {
    const entries: UserEntry[] = [];
    const lastSync = await this.stateService.getLastUserSync();
    const oktaFilter = this.buildOktaFilter(this.syncConfig.userFilter, force, lastSync);
    const setFilter = this.createCustomSet(this.syncConfig.userFilter);

    this.logService.info("Querying users.");
    const usersPromise = this.apiGetMany(
      "users?filter=" + this.encodeUrlParameter(oktaFilter)
    ).then((users: any[]) => {
      for (const user of users) {
        const entry = this.buildUser(user);
        if (entry != null && !this.filterOutResult(setFilter, entry.email)) {
          entries.push(entry);
        }
      }
    });

    // Deactivated users have to be queried for separately, only when no filter is provided in the first query
    let deactUsersPromise: any;
    if (oktaFilter == null || oktaFilter.indexOf("lastUpdated ") === -1) {
      let deactOktaFilter = 'status eq "DEPROVISIONED"';
      if (oktaFilter != null) {
        deactOktaFilter = "(" + oktaFilter + ") and " + deactOktaFilter;
      }
      deactUsersPromise = this.apiGetMany(
        "users?filter=" + this.encodeUrlParameter(deactOktaFilter)
      ).then((users: any[]) => {
        for (const user of users) {
          const entry = this.buildUser(user);
          if (entry != null && !this.filterOutResult(setFilter, entry.email)) {
            entries.push(entry);
          }
        }
      });
    } else {
      deactUsersPromise = Promise.resolve();
    }

    await Promise.all([usersPromise, deactUsersPromise]);
    return entries;
  }

  private buildUser(user: any) {
    const entry = new UserEntry();
    entry.externalId = user.id;
    entry.referenceId = user.id;
    entry.email = user.profile.email != null ? user.profile.email.trim().toLowerCase() : null;
    entry.deleted = user.status === "DEPROVISIONED";
    entry.disabled = user.status === "SUSPENDED";
    return entry;
  }

  private async getGroups(
    force: boolean,
    setFilter: [boolean, Set<string>]
  ): Promise<GroupEntry[]> {
    const entries: GroupEntry[] = [];
    const lastSync = await this.stateService.getLastGroupSync();
    const oktaFilter = this.buildOktaFilter(this.syncConfig.groupFilter, force, lastSync);

    this.logService.info("Querying groups.");
    await this.apiGetMany("groups?filter=" + this.encodeUrlParameter(oktaFilter)).then(
      async (groups: any[]) => {
        for (const group of groups.filter(
          (g) => !this.filterOutResult(setFilter, g.profile.name)
        )) {
          const entry = await this.buildGroup(group);
          if (entry != null) {
            entries.push(entry);
          }
        }
      }
    );
    return entries;
  }

  private async buildGroup(group: any): Promise<GroupEntry> {
    const entry = new GroupEntry();
    entry.externalId = group.id;
    entry.referenceId = group.id;
    entry.name = group.profile.name;

    // throttle some to avoid rate limiting
    const neededDelay =
      DelayBetweenBuildGroupCallsInMilliseconds - (Date.now() - this.lastBuildGroupCall);
    if (neededDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, neededDelay));
    }
    this.lastBuildGroupCall = Date.now();

    await this.apiGetMany("groups/" + group.id + "/users").then((users: any[]) => {
      for (const user of users) {
        entry.userMemberExternalIds.add(user.id);
      }
    });

    return entry;
  }

  private buildOktaFilter(baseFilter: string, force: boolean, lastSync: Date) {
    baseFilter = this.createDirectoryQuery(baseFilter);
    baseFilter = baseFilter == null || baseFilter.trim() === "" ? null : baseFilter;
    if (force || lastSync == null) {
      return baseFilter;
    }

    const updatedFilter = 'lastUpdated gt "' + lastSync.toISOString() + '"';
    if (baseFilter == null) {
      return updatedFilter;
    }

    return "(" + baseFilter + ") and " + updatedFilter;
  }

  private encodeUrlParameter(filter: string): string {
    return filter == null ? "" : encodeURIComponent(filter);
  }

  private async apiGetCall(url: string): Promise<[any, Map<string, string | string[]>]> {
    const u = new URL(url);
    return new Promise((resolve) => {
      https.get(
        {
          hostname: u.hostname,
          path: u.pathname + u.search,
          port: 443,
          headers: {
            Authorization: "SSWS " + this.dirConfig.token,
            Accept: "application/json",
          },
        },
        (res) => {
          let body = "";

          res.on("data", (chunk) => {
            body += chunk;
          });

          res.on("end", () => {
            if (res.statusCode !== 200) {
              resolve(null);
              return;
            }

            const responseJson = JSON.parse(body);
            if (res.headers != null) {
              const headersMap = new Map<string, string | string[]>();
              for (const key in res.headers) {
                if (res.headers.hasOwnProperty(key)) {
                  const val = res.headers[key];
                  headersMap.set(key.toLowerCase(), val);
                }
              }
              resolve([responseJson, headersMap]);
              return;
            }
            resolve([responseJson, null]);
          });

          res.on("error", () => {
            resolve(null);
          });
        }
      );
    });
  }

  private async apiGetMany(endpoint: string, currentData: any[] = []): Promise<any[]> {
    const url =
      endpoint.indexOf("https://") === 0 ? endpoint : `${this.dirConfig.orgUrl}/api/v1/${endpoint}`;
    const response = await this.apiGetCall(url);
    if (response == null || response[0] == null || !Array.isArray(response[0])) {
      throw new Error("API call failed.");
    }
    if (response[0].length === 0) {
      return currentData;
    }
    currentData = currentData.concat(response[0]);
    if (response[1] == null) {
      return currentData;
    }
    const linkHeader = response[1].get("link");
    if (linkHeader == null || Array.isArray(linkHeader)) {
      return currentData;
    }
    let nextLink: string = null;
    const linkHeaderParts = linkHeader.split(",");
    for (const part of linkHeaderParts) {
      if (part.indexOf('; rel="next"') > -1) {
        const subParts = part.split(";");
        if (subParts.length > 0 && subParts[0].indexOf("https://") > -1) {
          nextLink = subParts[0].replace(">", "").replace("<", "").trim();
          break;
        }
      }
    }
    if (nextLink == null) {
      return currentData;
    }
    return this.apiGetMany(nextLink, currentData);
  }
}
