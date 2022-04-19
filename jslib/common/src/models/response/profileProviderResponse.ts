import { ProviderUserStatusType } from "../../enums/providerUserStatusType";
import { ProviderUserType } from "../../enums/providerUserType";
import { PermissionsApi } from "../api/permissionsApi";

import { BaseResponse } from "./baseResponse";

export class ProfileProviderResponse extends BaseResponse {
  id: string;
  name: string;
  key: string;
  status: ProviderUserStatusType;
  type: ProviderUserType;
  enabled: boolean;
  permissions: PermissionsApi;
  userId: string;
  useEvents: boolean;

  constructor(response: any) {
    super(response);
    this.id = this.getResponseProperty("Id");
    this.name = this.getResponseProperty("Name");
    this.key = this.getResponseProperty("Key");
    this.status = this.getResponseProperty("Status");
    this.type = this.getResponseProperty("Type");
    this.enabled = this.getResponseProperty("Enabled");
    this.permissions = new PermissionsApi(this.getResponseProperty("permissions"));
    this.userId = this.getResponseProperty("UserId");
    this.useEvents = this.getResponseProperty("UseEvents");
  }
}
