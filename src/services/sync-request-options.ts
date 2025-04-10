import { GroupEntry } from "../models/groupEntry";
import { UserEntry } from "../models/userEntry";

export interface SyncRequestOptions {
  groups: GroupEntry;
  users: UserEntry;
  removeDisabled: boolean;
  overwriteExisting: boolean;
}
