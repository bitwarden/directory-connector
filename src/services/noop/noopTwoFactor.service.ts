import {
  TwoFactorProviderDetails,
  TwoFactorService,
} from "@/jslib/common/src/abstractions/twoFactor.service";
import { TwoFactorProviderType } from "@/jslib/common/src/enums/twoFactorProviderType";
import { IdentityTwoFactorResponse } from "@/jslib/common/src/models/response/identityTwoFactorResponse";

export class NoopTwoFactorService implements TwoFactorService {
  init() {
    // Noop
  }

  getSupportedProviders(win: Window): TwoFactorProviderDetails[] {
    return null;
  }

  getDefaultProvider(webAuthnSupported: boolean): TwoFactorProviderType {
    return null;
  }

  setSelectedProvider(type: TwoFactorProviderType) {
    // Noop
  }

  clearSelectedProvider() {
    // Noop
  }

  setProviders(response: IdentityTwoFactorResponse) {
    // Noop
  }

  clearProviders() {
    // Noop
  }

  getProviders(): Map<TwoFactorProviderType, { [key: string]: string }> {
    return null;
  }
}
