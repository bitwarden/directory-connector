import {
  TwoFactorProviderDetails,
  TwoFactorService,
} from "jslib-common/abstractions/twoFactor.service";

import { TwoFactorProviderType } from "jslib-common/enums/twoFactorProviderType";

import { IdentityTwoFactorResponse } from "jslib-common/models/response/identityTwoFactorResponse";

export class NoopTwoFactorService implements TwoFactorService {
  init() {}

  getSupportedProviders(win: Window): TwoFactorProviderDetails[] {
    return null;
  }

  getDefaultProvider(webAuthnSupported: boolean): TwoFactorProviderType {
    return null;
  }

  setSelectedProvider(type: TwoFactorProviderType) {}

  clearSelectedProvider() {}

  setProviders(response: IdentityTwoFactorResponse) {}

  clearProviders() {}

  getProviders(): Map<TwoFactorProviderType, { [key: string]: string }> {
    return null;
  }
}
