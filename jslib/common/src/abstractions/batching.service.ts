import { GroupEntry } from "@/src/models/groupEntry";
import { UserEntry } from "@/src/models/userEntry";

import { OrganizationImportRequest } from "../models/request/organizationImportRequest";

export abstract class BatchingService {
  batchRequests: (
    groups: GroupEntry[],
    users: UserEntry[],
    removeDisabled: boolean,
    overwriteExisting: boolean,
  ) => OrganizationImportRequest[];
}
