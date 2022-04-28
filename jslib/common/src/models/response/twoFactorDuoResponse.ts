import { BaseResponse } from "./baseResponse";

export class TwoFactorDuoResponse extends BaseResponse {
  enabled: boolean;
  host: string;
  secretKey: string;
  integrationKey: string;

  constructor(response: any) {
    super(response);
    this.enabled = this.getResponseProperty("Enabled");
    this.host = this.getResponseProperty("Host");
    this.secretKey = this.getResponseProperty("SecretKey");
    this.integrationKey = this.getResponseProperty("IntegrationKey");
  }
}
