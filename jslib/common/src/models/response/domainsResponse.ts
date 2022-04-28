import { BaseResponse } from "./baseResponse";
import { GlobalDomainResponse } from "./globalDomainResponse";

export class DomainsResponse extends BaseResponse {
  equivalentDomains: string[][];
  globalEquivalentDomains: GlobalDomainResponse[] = [];

  constructor(response: any) {
    super(response);
    this.equivalentDomains = this.getResponseProperty("EquivalentDomains");
    const globalEquivalentDomains = this.getResponseProperty("GlobalEquivalentDomains");
    if (globalEquivalentDomains != null) {
      this.globalEquivalentDomains = globalEquivalentDomains.map(
        (d: any) => new GlobalDomainResponse(d)
      );
    } else {
      this.globalEquivalentDomains = [];
    }
  }
}
