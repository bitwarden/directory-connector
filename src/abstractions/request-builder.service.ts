import { OrganizationImportRequest } from "@/jslib/common/src/models/request/organizationImportRequest";

import { GroupEntry } from "@/src/models/groupEntry";
import { UserEntry } from "@/src/models/userEntry";

export abstract class RequestBuilder {
  buildRequest: (
    groups: GroupEntry[],
    users: UserEntry[],
    options: {
      removeDisabled: boolean;
      overwriteExisting: boolean;
    },
  ) => OrganizationImportRequest[];
}
