import { OrganizationKeysRequest } from "./organizationKeysRequest";

export class OrganizationUpdateRequest {
  name: string;
  identifier: string;
  businessName: string;
  billingEmail: string;
  keys: OrganizationKeysRequest;
}
