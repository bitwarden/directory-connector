import { StateService } from "@/libs/abstractions/state.service";

import { Response } from "@/src-cli/cli/models/response";
import { StringResponse } from "@/src-cli/cli/models/response/stringResponse";

export class LastSyncCommand {
  constructor(private stateService: StateService) {}

  async run(object: string): Promise<Response> {
    try {
      switch (object.toLowerCase()) {
        case "groups": {
          const groupsDate = await this.stateService.getLastGroupSync();
          const groupsRes = new StringResponse(
            groupsDate == null ? null : groupsDate.toISOString(),
          );
          return Response.success(groupsRes);
        }
        case "users": {
          const usersDate = await this.stateService.getLastUserSync();
          const usersRes = new StringResponse(usersDate == null ? null : usersDate.toISOString());
          return Response.success(usersRes);
        }
        default:
          return Response.badRequest("Unknown object.");
      }
    } catch (e) {
      return Response.error(e);
    }
  }
}
