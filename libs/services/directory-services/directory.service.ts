import { GroupEntry } from "../../models/groupEntry";
import { UserEntry } from "../../models/userEntry";

export interface IDirectoryService {
  getEntries(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]>;

  /**
   * Checks that the saved configuration can authenticate against the directory, without reading
   * any users or groups. Resolves when the connection works and rejects with a user-facing error
   * otherwise.
   */
  testConnection(): Promise<void>;
}
