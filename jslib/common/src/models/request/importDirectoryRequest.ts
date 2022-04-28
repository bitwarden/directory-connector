import { ImportDirectoryRequestGroup } from "./importDirectoryRequestGroup";
import { ImportDirectoryRequestUser } from "./importDirectoryRequestUser";

export class ImportDirectoryRequest {
  groups: ImportDirectoryRequestGroup[] = [];
  users: ImportDirectoryRequestUser[] = [];
  overwriteExisting = false;
  largeImport = false;
}
