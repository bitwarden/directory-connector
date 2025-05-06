import { OrganizationImportRequest } from "@/jslib/common/src/models/request/organizationImportRequest";

import { GroupEntry } from "@/src/models/groupEntry";
import { UserEntry } from "@/src/models/userEntry";

import { RequestBuilder, RequestBuilderOptions } from "../abstractions/request-builder.service";

/**
 * This class is responsible for building small (<2k users) syncs as a single
 * request to the /import endpoint. This is done to be backwards compatible with
 * existing functionality for sync requests that are sufficiently small enough to not
 * exceed default maximum packet size limits on NGINX web servers.
 * */
export class SingleRequestBuilder implements RequestBuilder {
  buildRequest(
    groups: GroupEntry[],
    users: UserEntry[],
    options: RequestBuilderOptions,
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
            deleted: u.deleted || (options.removeDisabled && u.disabled),
          };
        }),
        overwriteExisting: options.overwriteExisting,
        largeImport: false,
      }),
    ];
  }
}
