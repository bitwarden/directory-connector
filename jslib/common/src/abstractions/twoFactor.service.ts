import { TwoFactorProviderType } from "../enums/twoFactorProviderType";
import { IdentityTwoFactorResponse } from "../models/response/identityTwoFactorResponse";

export interface TwoFactorProviderDetails {
  type: TwoFactorProviderType;
  name: string;
  description: string;
  priority: number;
  sort: number;
  premium: boolean;
}

export abstract class TwoFactorService {
  init: () => void;
  getSupportedProviders: (win: Window) => TwoFactorProviderDetails[];
  getDefaultProvider: (webAuthnSupported: boolean) => TwoFactorProviderType;
  setSelectedProvider: (type: TwoFactorProviderType) => void;
  clearSelectedProvider: () => void;

  setProviders: (response: IdentityTwoFactorResponse) => void;
  clearProviders: () => void;
  getProviders: () => Map<TwoFactorProviderType, { [key: string]: string }>;
}
