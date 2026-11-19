function compareStrings(a: string, b: string): number {
  const left = a ?? "";
  const right = b ?? "";
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

export interface SortableGroup {
  name: string;
  externalId: string;
  memberExternalIds: string[];
}

export interface SortableUser {
  email: string;
  externalId: string;
  deleted: boolean;
}

export function sortGroups<T extends SortableGroup>(groups: T[]): T[] {
  groups.forEach((g) => g.memberExternalIds?.sort(compareStrings));
  return groups.sort(
    (a, b) => compareStrings(a.externalId, b.externalId) || compareStrings(a.name, b.name),
  );
}

export function sortUsers<T extends SortableUser>(users: T[]): T[] {
  return users.sort(
    (a, b) => compareStrings(a.externalId, b.externalId) || compareStrings(a.email, b.email),
  );
}
