import { OrganizationUserType } from "../../enums/organizationUserType";
import { PermissionsApi } from "../api/permissionsApi";

import { SelectionReadOnlyRequest } from "./selectionReadOnlyRequest";

export class OrganizationUserUpdateRequest {
  type: OrganizationUserType;
  accessAll: boolean;
  collections: SelectionReadOnlyRequest[] = [];
  permissions: PermissionsApi;
}
