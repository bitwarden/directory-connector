import { BaseResponse } from "./baseResponse";

export class TaxRateResponse extends BaseResponse {
  id: string;
  country: string;
  state: string;
  postalCode: string;
  rate: number;

  constructor(response: any) {
    super(response);
    this.id = this.getResponseProperty("Id");
    this.country = this.getResponseProperty("Country");
    this.state = this.getResponseProperty("State");
    this.postalCode = this.getResponseProperty("PostalCode");
    this.rate = this.getResponseProperty("Rate");
  }
}
