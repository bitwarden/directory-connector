import { PlanType } from "../../enums/planType";

import { OrganizationKeysRequest } from "./organizationKeysRequest";

export class OrganizationUpgradeRequest {
  businessName: string;
  planType: PlanType;
  additionalSeats: number;
  additionalStorageGb: number;
  premiumAccessAddon: boolean;
  billingAddressCountry: string;
  billingAddressPostalCode: string;
  keys: OrganizationKeysRequest;
}
