import { ProviderUserType } from "../../../enums/providerUserType";

export class ProviderUserInviteRequest {
  emails: string[] = [];
  type: ProviderUserType;
}
