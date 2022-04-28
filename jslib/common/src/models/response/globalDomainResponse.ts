import { BaseResponse } from "./baseResponse";

export class GlobalDomainResponse extends BaseResponse {
  type: number;
  domains: string[];
  excluded: boolean;

  constructor(response: any) {
    super(response);
    this.type = this.getResponseProperty("Type");
    this.domains = this.getResponseProperty("Domains");
    this.excluded = this.getResponseProperty("Excluded");
  }
}
