import { BaseResponse } from "./baseResponse";

export class UserKeyResponse extends BaseResponse {
  userId: string;
  publicKey: string;

  constructor(response: any) {
    super(response);
    this.userId = this.getResponseProperty("UserId");
    this.publicKey = this.getResponseProperty("PublicKey");
  }
}
