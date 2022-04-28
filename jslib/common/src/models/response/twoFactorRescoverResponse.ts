import { BaseResponse } from "./baseResponse";

export class TwoFactorRecoverResponse extends BaseResponse {
  code: string;

  constructor(response: any) {
    super(response);
    this.code = this.getResponseProperty("Code");
  }
}
