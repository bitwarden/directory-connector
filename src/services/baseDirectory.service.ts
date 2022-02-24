import { GroupEntry } from "../models/groupEntry";
import { SyncConfiguration } from "../models/syncConfiguration";
import { UserEntry } from "../models/userEntry";

export abstract class BaseDirectoryService {
  protected createDirectoryQuery(filter: string) {
    if (filter == null || filter === "") {
      return null;
    }

    const mainParts = filter.split("|");
    if (mainParts.length < 2 || mainParts[1] == null || mainParts[1].trim() === "") {
      return null;
    }

    return mainParts[1].trim();
  }

  protected createCustomSet(filter: string): [boolean, Set<string>] {
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
    } else {
      return null;
    }

    const set = new Set<string>();
    const pieces = parts[1].split(",");
    for (const p of pieces) {
      set.add(p.trim().toLowerCase());
    }

    return [exclude, set];
  }

  protected filterOutResult(setFilter: [boolean, Set<string>], result: string) {
    if (setFilter != null) {
      const cleanResult = result != null ? result.trim().toLowerCase() : "--";
      const excluded = setFilter[0];
      const set = setFilter[1];

      if (excluded && set.has(cleanResult)) {
        return true;
      } else if (!excluded && !set.has(cleanResult)) {
        return true;
      }
    }

    return false;
  }

  protected filterUsersFromGroupsSet(
    users: UserEntry[],
    groups: GroupEntry[],
    setFilter: [boolean, Set<string>],
    syncConfig: SyncConfiguration
  ): UserEntry[] {
    if (setFilter == null || users == null) {
      return users;
    }

    return users.filter((u) => {
      if (u.deleted) {
        return true;
      }
      if (u.disabled && syncConfig.removeDisabled) {
        return true;
      }

      return groups.filter((g) => g.userMemberExternalIds.has(u.externalId)).length > 0;
    });
  }

  protected forceGroup(force: boolean, users: UserEntry[]): boolean {
    return force || (users != null && users.filter((u) => !u.deleted && !u.disabled).length > 0);
  }
}
