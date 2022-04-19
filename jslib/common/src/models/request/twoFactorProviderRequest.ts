import { TwoFactorProviderType } from "../../enums/twoFactorProviderType";

import { SecretVerificationRequest } from "./secretVerificationRequest";

export class TwoFactorProviderRequest extends SecretVerificationRequest {
  type: TwoFactorProviderType;
}
