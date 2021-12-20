import { Entry } from "./entry";

export class GroupEntry extends Entry {
  name: string;
  userMemberExternalIds = new Set<string>();
  groupMemberReferenceIds = new Set<string>();

  get displayName(): string {
    if (this.name == null) {
      return this.referenceId;
    }

    return this.name;
  }
}
