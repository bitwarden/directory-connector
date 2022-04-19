import { ProviderUserStatusType } from "../../enums/providerUserStatusType";
import { ProviderUserType } from "../../enums/providerUserType";
import { ProviderData } from "../data/providerData";

export class Provider {
  id: string;
  name: string;
  status: ProviderUserStatusType;
  type: ProviderUserType;
  enabled: boolean;
  userId: string;
  useEvents: boolean;

  constructor(obj?: ProviderData) {
    if (obj == null) {
      return;
    }

    this.id = obj.id;
    this.name = obj.name;
    this.status = obj.status;
    this.type = obj.type;
    this.enabled = obj.enabled;
    this.userId = obj.userId;
    this.useEvents = obj.useEvents;
  }

  get canAccess() {
    if (this.isProviderAdmin) {
      return true;
    }
    return this.enabled && this.status === ProviderUserStatusType.Confirmed;
  }

  get canCreateOrganizations() {
    return this.enabled && this.isProviderAdmin;
  }

  get canManageUsers() {
    return this.isProviderAdmin;
  }

  get canAccessEventLogs() {
    return this.isProviderAdmin;
  }

  get isProviderAdmin() {
    return this.type === ProviderUserType.ProviderAdmin;
  }
}
