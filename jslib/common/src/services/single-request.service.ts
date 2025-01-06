import { OrganizationImportRequest } from "@/jslib/common/src/models/request/organizationImportRequest";

import { GroupEntry } from "@/src/models/groupEntry";
import { UserEntry } from "@/src/models/userEntry";

import { RequestBuilderAbstratction } from "../abstractions/request-builder.service";

export class SingleRequestBuilder implements RequestBuilderAbstratction {
  buildRequest(
    groups: GroupEntry[],
    users: UserEntry[],
    removeDisabled: boolean,
    overwriteExisting: boolean,
  ): OrganizationImportRequest[] {
    return [
      new OrganizationImportRequest({
        groups: (groups ?? []).map((g) => {
          return {
            name: g.name,
            externalId: g.externalId,
            memberExternalIds: Array.from(g.userMemberExternalIds),
          };
        }),
        users: (users ?? []).map((u) => {
          return {
            email: u.email,
            externalId: u.externalId,
            deleted: u.deleted || (removeDisabled && u.disabled),
          };
        }),
        overwriteExisting: overwriteExisting,
        largeImport: false,
      }),
    ];
  }
}
