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
}
