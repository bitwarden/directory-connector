import { OrganizationImportRequest } from "@/jslib/common/src/models/request/organizationImportRequest";

import { GroupEntry } from "@/src/models/groupEntry";
import { UserEntry } from "@/src/models/userEntry";

export class RequestBuilderOptions {
  constructor(options: { removeDisabled: boolean; overwriteExisting: boolean }) {
    this.removeDisabled = options.removeDisabled;
    this.overwriteExisting = options.overwriteExisting;
  }

  removeDisabled: boolean = false;
  overwriteExisting: boolean = false;
}

export abstract class RequestBuilder {
  buildRequest: (
    groups: GroupEntry[],
    users: UserEntry[],
    options: RequestBuilderOptions,
  ) => OrganizationImportRequest[];
}
