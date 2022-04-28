import { ProviderUserStatusType } from "../../enums/providerUserStatusType";
import { ProviderUserType } from "../../enums/providerUserType";
import { ProfileProviderResponse } from "../response/profileProviderResponse";

export class ProviderData {
  id: string;
  name: string;
  status: ProviderUserStatusType;
  type: ProviderUserType;
  enabled: boolean;
  userId: string;
  useEvents: boolean;

  constructor(response: ProfileProviderResponse) {
    this.id = response.id;
    this.name = response.name;
    this.status = response.status;
    this.type = response.type;
    this.enabled = response.enabled;
    this.userId = response.userId;
    this.useEvents = response.useEvents;
  }
}
