import { ImportDirectoryRequestGroup } from "./importDirectoryRequestGroup";

export class OrganizationImportGroupRequest {
  name: string;
  externalId: string;
  memberExternalIds: string[];

  constructor(model: Required<OrganizationImportGroupRequest> | ImportDirectoryRequestGroup) {
    this.name = model.name;
    this.externalId = model.externalId;

    if (model instanceof ImportDirectoryRequestGroup) {
      this.memberExternalIds = model.users;
    } else {
      this.memberExternalIds = model.memberExternalIds;
    }
  }
}
