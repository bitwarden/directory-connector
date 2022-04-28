import { TwoFactorProviderType } from "../../enums/twoFactorProviderType";

import { BaseResponse } from "./baseResponse";

export class TwoFactorProviderResponse extends BaseResponse {
  enabled: boolean;
  type: TwoFactorProviderType;

  constructor(response: any) {
    super(response);
    this.enabled = this.getResponseProperty("Enabled");
    this.type = this.getResponseProperty("Type");
  }
}
