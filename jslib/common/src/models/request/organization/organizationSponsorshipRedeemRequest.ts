import { PlanSponsorshipType } from "../../../enums/planSponsorshipType";

export class OrganizationSponsorshipRedeemRequest {
  planSponsorshipType: PlanSponsorshipType;
  sponsoredOrganizationId: string;
}
