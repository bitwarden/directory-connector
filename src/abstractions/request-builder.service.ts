import { OrganizationImportRequest } from "@/jslib/common/src/models/request/organizationImportRequest";

import { GroupEntry } from "@/src/models/groupEntry";
import { UserEntry } from "@/src/models/userEntry";

export interface RequestBuilderOptions {
  removeDisabled: boolean;
  overwriteExisting: boolean;
}

export abstract class RequestBuilder {
  buildRequest: (
    groups: GroupEntry[],
    users: UserEntry[],
    options: RequestBuilderOptions,
  ) => OrganizationImportRequest[];
}
