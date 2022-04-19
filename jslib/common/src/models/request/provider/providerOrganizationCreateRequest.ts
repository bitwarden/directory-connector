import { OrganizationCreateRequest } from "../organizationCreateRequest";

export class ProviderOrganizationCreateRequest {
  constructor(
    public clientOwnerEmail: string,
    public organizationCreateRequest: OrganizationCreateRequest
  ) {}
}
