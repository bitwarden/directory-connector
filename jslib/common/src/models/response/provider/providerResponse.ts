import { BaseResponse } from "../baseResponse";

export class ProviderResponse extends BaseResponse {
  id: string;
  name: string;
  businessName: string;
  billingEmail: string;

  constructor(response: any) {
    super(response);
    this.id = this.getResponseProperty("Id");
    this.name = this.getResponseProperty("Name");
    this.businessName = this.getResponseProperty("BusinessName");
    this.billingEmail = this.getResponseProperty("BillingEmail");
  }
}
