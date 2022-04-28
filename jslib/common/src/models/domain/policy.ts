import { PolicyType } from "../../enums/policyType";
import { PolicyData } from "../data/policyData";

import Domain from "./domainBase";

export class Policy extends Domain {
  id: string;
  organizationId: string;
  type: PolicyType;
  data: any;
  enabled: boolean;

  constructor(obj?: PolicyData) {
    super();
    if (obj == null) {
      return;
    }

    this.id = obj.id;
    this.organizationId = obj.organizationId;
    this.type = obj.type;
    this.data = obj.data;
    this.enabled = obj.enabled;
  }
}
