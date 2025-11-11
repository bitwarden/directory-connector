import { GroupEntry } from "../../models/groupEntry";
import { UserEntry } from "../../models/userEntry";

export interface IDirectoryService {
  getEntries(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]>;
}
