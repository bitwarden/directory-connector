import { DeviceType } from "../../enums/deviceType";
import { EventType } from "../../enums/eventType";

import { BaseResponse } from "./baseResponse";

export class EventResponse extends BaseResponse {
  type: EventType;
  userId: string;
  organizationId: string;
  providerId: string;
  cipherId: string;
  collectionId: string;
  groupId: string;
  policyId: string;
  organizationUserId: string;
  providerUserId: string;
  providerOrganizationId: string;
  actingUserId: string;
  date: string;
  deviceType: DeviceType;
  ipAddress: string;

  constructor(response: any) {
    super(response);
    this.type = this.getResponseProperty("Type");
    this.userId = this.getResponseProperty("UserId");
    this.organizationId = this.getResponseProperty("OrganizationId");
    this.providerId = this.getResponseProperty("ProviderId");
    this.cipherId = this.getResponseProperty("CipherId");
    this.collectionId = this.getResponseProperty("CollectionId");
    this.groupId = this.getResponseProperty("GroupId");
    this.policyId = this.getResponseProperty("PolicyId");
    this.organizationUserId = this.getResponseProperty("OrganizationUserId");
    this.providerUserId = this.getResponseProperty("ProviderUserId");
    this.providerOrganizationId = this.getResponseProperty("ProviderOrganizationId");
    this.actingUserId = this.getResponseProperty("ActingUserId");
    this.date = this.getResponseProperty("Date");
    this.deviceType = this.getResponseProperty("DeviceType");
    this.ipAddress = this.getResponseProperty("IpAddress");
  }
}
