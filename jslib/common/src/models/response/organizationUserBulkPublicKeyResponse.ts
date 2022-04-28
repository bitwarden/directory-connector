import { BaseResponse } from "./baseResponse";

export class OrganizationUserBulkPublicKeyResponse extends BaseResponse {
  id: string;
  userId: string;
  key: string;

  constructor(response: any) {
    super(response);
    this.id = this.getResponseProperty("Id");
    this.userId = this.getResponseProperty("UserId");
    this.key = this.getResponseProperty("Key");
  }
}
