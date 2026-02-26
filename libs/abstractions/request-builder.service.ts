import { GroupEntry } from "@/libs/models/groupEntry";
import { UserEntry } from "@/libs/models/userEntry";

import { OrganizationImportRequest } from "@/jslib/common/src/models/request/organizationImportRequest";

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
