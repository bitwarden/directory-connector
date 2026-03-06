import { GroupEntry } from "@/libs/models/groupEntry";
import { OrganizationImportRequest } from "@/libs/models/request/organizationImportRequest";
import { UserEntry } from "@/libs/models/userEntry";


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
