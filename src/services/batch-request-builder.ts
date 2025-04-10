import { OrganizationImportRequest } from "@/jslib/common/src/models/request/organizationImportRequest";

import { GroupEntry } from "@/src/models/groupEntry";
import { UserEntry } from "@/src/models/userEntry";

import { RequestBuilder } from "../abstractions/request-builder.service";

import { batchSize } from "./sync.service";

/**
 * This class is responsible for batching large sync requests (>2k users) into multiple smaller
 * requests to the /import endpoint. This is done to ensure we are under the default
 * maximum packet size for NGINX web servers to avoid the request potentially timing out
 * */
export class BatchRequestBuilder implements RequestBuilder {
  buildRequest(
    groups: GroupEntry[],
    users: UserEntry[],
    options: {
      removeDisabled: boolean;
      overwriteExisting: boolean;
    },
  ): OrganizationImportRequest[] {
    if (options.overwriteExisting) {
      throw new Error(
        "You cannot use the 'Remove and re-add organization users during the next sync' option with large imports.",
      );
    }

    const requests: OrganizationImportRequest[] = [];

    if (users.length > 0) {
      const usersRequest = users.map((u) => {
        return {
          email: u.email,
          externalId: u.externalId,
          deleted: u.deleted || (options.removeDisabled && u.disabled),
        };
      });

      // Partition users
      for (let i = 0; i < usersRequest.length; i += batchSize) {
        const u = usersRequest.slice(i, i + batchSize);
        const req = new OrganizationImportRequest({
          groups: [],
          users: u,
          largeImport: true,
          overwriteExisting: options.overwriteExisting,
        });
        requests.push(req);
      }
    }

    if (groups.length > 0) {
      const groupRequest = groups.map((g) => {
        return {
          name: g.name,
          externalId: g.externalId,
          memberExternalIds: Array.from(g.userMemberExternalIds),
        };
      });

      // Partition groups
      for (let i = 0; i < groupRequest.length; i += batchSize) {
        const g = groupRequest.slice(i, i + batchSize);
        const req = new OrganizationImportRequest({
          groups: g,
          users: [],
          largeImport: true,
          overwriteExisting: options.overwriteExisting,
        });
        requests.push(req);
      }
    }

    return requests;
  }
}
