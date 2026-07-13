import { ImportDirectoryRequest } from "@/libs/models/request/importDirectoryRequest";
import { OrganizationImportGroupRequest } from "@/libs/models/request/organizationImportGroupRequest";
import { OrganizationImportMemberRequest } from "@/libs/models/request/organizationImportMemberRequest";

export class OrganizationImportRequest {
  groups: OrganizationImportGroupRequest[] = [];
  members: OrganizationImportMemberRequest[] = [];
  overwriteExisting = false;
  largeImport = false;
  inviteUsersAfterProvisioning = true;

  constructor(model: {
    groups: Required<OrganizationImportGroupRequest>[];
    users: Required<OrganizationImportMemberRequest>[];
    overwriteExisting: boolean;
    largeImport: boolean;
    inviteUsersAfterProvisioning?: boolean;
  }) {
    if (model instanceof ImportDirectoryRequest) {
      this.groups = model.groups.map((g) => new OrganizationImportGroupRequest(g));
      this.members = model.users.map((u) => new OrganizationImportMemberRequest(u));
    } else {
      this.groups = model.groups.map((g) => new OrganizationImportGroupRequest(g));
      this.members = model.users.map((u) => new OrganizationImportMemberRequest(u));
    }
    this.overwriteExisting = model.overwriteExisting;
    this.largeImport = model.largeImport;
    // Defaults to true so existing configurations (where the flag is absent) keep sending invitations.
    this.inviteUsersAfterProvisioning = model.inviteUsersAfterProvisioning ?? true;
  }
}
