import { BatchingService as BatchingServiceAbstraction } from "@/jslib/common/src/abstractions/batching.service";
import { OrganizationImportRequest } from "@/jslib/common/src/models/request/organizationImportRequest";

import { GroupEntry } from "@/src/models/groupEntry";
import { UserEntry } from "@/src/models/userEntry";

export class BatchingService implements BatchingServiceAbstraction {
  batchSize = 2000;

  batchRequests(
    groups: GroupEntry[],
    users: UserEntry[],
    removeDisabled: boolean,
    overwriteExisting: boolean,
  ): OrganizationImportRequest[] {
    const requests: OrganizationImportRequest[] = [];

    if (users.length > 0) {
      const usersRequest = users.map((u) => {
        return {
          email: u.email,
          externalId: u.externalId,
          deleted: u.deleted || (removeDisabled && u.disabled),
        };
      });

      // Partition users
      for (let i = 0; i < usersRequest.length; i += this.batchSize) {
        const u = usersRequest.slice(i, i + this.batchSize);
        const req = new OrganizationImportRequest({
          groups: [],
          users: u,
          largeImport: true,
          overwriteExisting,
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
      for (let i = 0; i < groupRequest.length; i += this.batchSize) {
        const g = groupRequest.slice(i, i + this.batchSize);
        const req = new OrganizationImportRequest({
          groups: g,
          users: [],
          largeImport: true,
          overwriteExisting,
        });
        requests.push(req);
      }
    }

    return requests;
  }
}
