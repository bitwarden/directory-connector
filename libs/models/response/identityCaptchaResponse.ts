import { BaseResponse } from "@/libs/models/response/baseResponse";

export class IdentityCaptchaResponse extends BaseResponse {
  siteKey: string;

  constructor(response: any) {
    super(response);
    this.siteKey = this.getResponseProperty("HCaptcha_SiteKey");
  }
}
