import { BaseResponse } from "./baseResponse";

export class KeyConnectorUserKeyResponse extends BaseResponse {
  key: string;

  constructor(response: any) {
    super(response);
    this.key = this.getResponseProperty("Key");
  }
}
