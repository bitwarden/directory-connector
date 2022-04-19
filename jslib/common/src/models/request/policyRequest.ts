import { PolicyType } from "../../enums/policyType";

export class PolicyRequest {
  type: PolicyType;
  enabled: boolean;
  data: any;
}
