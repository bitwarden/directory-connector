import { PlanSponsorshipType } from "../../../enums/planSponsorshipType";

export class OrganizationSponsorshipCreateRequest {
  sponsoredEmail: string;
  planSponsorshipType: PlanSponsorshipType;
  friendlyName: string;
}
