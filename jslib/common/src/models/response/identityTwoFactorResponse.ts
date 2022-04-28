import { TwoFactorProviderType } from "../../enums/twoFactorProviderType";

import { BaseResponse } from "./baseResponse";

export class IdentityTwoFactorResponse extends BaseResponse {
  twoFactorProviders: TwoFactorProviderType[];
  twoFactorProviders2 = new Map<TwoFactorProviderType, { [key: string]: string }>();
  captchaToken: string;

  constructor(response: any) {
    super(response);
    this.captchaToken = this.getResponseProperty("CaptchaBypassToken");
    this.twoFactorProviders = this.getResponseProperty("TwoFactorProviders");
    const twoFactorProviders2 = this.getResponseProperty("TwoFactorProviders2");
    if (twoFactorProviders2 != null) {
      for (const prop in twoFactorProviders2) {
        // eslint-disable-next-line
        if (twoFactorProviders2.hasOwnProperty(prop)) {
          this.twoFactorProviders2.set(parseInt(prop, null), twoFactorProviders2[prop]);
        }
      }
    }
  }
}
