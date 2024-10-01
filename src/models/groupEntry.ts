import { Jsonify } from "type-fest";

import { Entry } from "./entry";
import { UserEntry } from "./userEntry";

export class GroupEntry extends Entry {
  name: string;
  userMemberExternalIds = new Set<string>();
  groupMemberReferenceIds = new Set<string>();
  users: UserEntry[] = [];

  get displayName(): string {
    if (this.name == null) {
      return this.referenceId;
    }

    return this.name;
  }

  toJSON() {
    return {
      name: this.name,
      referenceId: this.referenceId,
      externalId: this.externalId,
      userMemberExternalIds:
        this.userMemberExternalIds == null ? null : [...this.userMemberExternalIds],
      groupMemberReferenceIds:
        this.groupMemberReferenceIds == null ? null : [...this.groupMemberReferenceIds],
      users: this.users?.map((u) => u.toJSON()),
    };
  }

  static fromJSON(data: Jsonify<GroupEntry>) {
    const result = new GroupEntry();
    result.referenceId = data.referenceId;
    result.externalId = data.externalId;

    result.name = data.name;
    if (data.userMemberExternalIds != null) {
      result.userMemberExternalIds = new Set(data.userMemberExternalIds);
    }

    if (data.groupMemberReferenceIds != null) {
      result.groupMemberReferenceIds = new Set(data.groupMemberReferenceIds);
    }

    result.users = data.users?.map((u) => UserEntry.fromJSON(u));

    return result;
  }
}
