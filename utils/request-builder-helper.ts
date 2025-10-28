import { GetUniqueString } from "@/jslib/common/spec/utils";

import { GroupEntry } from "../src/models/groupEntry";
import { UserEntry } from "../src/models/userEntry";

export function userSimulator(userCount: number): UserEntry[] {
  const users: UserEntry[] = [];
  while (userCount > 0) {
    const userEntry = new UserEntry();
    userEntry.email = GetUniqueString() + "@example.com";
    users.push(userEntry);
    userCount--;
  }
  return users;
}

export function groupSimulator(groupCount: number): GroupEntry[] {
  const groups: GroupEntry[] = [];
  while (groupCount > 0) {
    const groupEntry = new GroupEntry();
    groupEntry.name = GetUniqueString();
    groups.push(groupEntry);
    groupCount--;
  }
  return groups;
}
