import { ImportDirectoryRequestGroup } from "@/libs/models/request/importDirectoryRequestGroup";
import { ImportDirectoryRequestUser } from "@/libs/models/request/importDirectoryRequestUser";

export class ImportDirectoryRequest {
  groups: ImportDirectoryRequestGroup[] = [];
  users: ImportDirectoryRequestUser[] = [];
  overwriteExisting = false;
  largeImport = false;
}
