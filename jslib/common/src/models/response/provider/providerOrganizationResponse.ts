import { BaseResponse } from "../baseResponse";

export class ProviderOrganizationResponse extends BaseResponse {
  id: string;
  providerId: string;
  organizationId: string;
  key: string;
  settings: string;
  creationDate: string;
  revisionDate: string;

  constructor(response: any) {
    super(response);
    this.id = this.getResponseProperty("Id");
    this.providerId = this.getResponseProperty("ProviderId");
    this.organizationId = this.getResponseProperty("OrganizationId");
    this.key = this.getResponseProperty("Key");
    this.settings = this.getResponseProperty("Settings");
    this.creationDate = this.getResponseProperty("CreationDate");
    this.revisionDate = this.getResponseProperty("RevisionDate");
  }
}

export class ProviderOrganizationOrganizationDetailsResponse extends ProviderOrganizationResponse {
  organizationName: string;

  constructor(response: any) {
    super(response);
    this.organizationName = this.getResponseProperty("OrganizationName");
  }
}
