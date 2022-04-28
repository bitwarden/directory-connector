import { BaseResponse } from "./baseResponse";

export class TwoFactorAuthenticatorResponse extends BaseResponse {
  enabled: boolean;
  key: string;

  constructor(response: any) {
    super(response);
    this.enabled = this.getResponseProperty("Enabled");
    this.key = this.getResponseProperty("Key");
  }
}
