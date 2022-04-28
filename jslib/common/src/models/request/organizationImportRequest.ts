import { ImportDirectoryRequest } from "./importDirectoryRequest";
import { OrganizationImportGroupRequest } from "./organizationImportGroupRequest";
import { OrganizationImportMemberRequest } from "./organizationImportMemberRequest";

export class OrganizationImportRequest {
  groups: OrganizationImportGroupRequest[] = [];
  members: OrganizationImportMemberRequest[] = [];
  overwriteExisting = false;
  largeImport = false;

  constructor(
    model:
      | {
          groups: Required<OrganizationImportGroupRequest>[];
          users: Required<OrganizationImportMemberRequest>[];
          overwriteExisting: boolean;
          largeImport: boolean;
        }
      | ImportDirectoryRequest
  ) {
    if (model instanceof ImportDirectoryRequest) {
      this.groups = model.groups.map((g) => new OrganizationImportGroupRequest(g));
      this.members = model.users.map((u) => new OrganizationImportMemberRequest(u));
    } else {
      this.groups = model.groups.map((g) => new OrganizationImportGroupRequest(g));
      this.members = model.users.map((u) => new OrganizationImportMemberRequest(u));
    }
    this.overwriteExisting = model.overwriteExisting;
    this.largeImport = model.largeImport;
  }
}
