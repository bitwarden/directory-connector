import * as program from "commander";

import { ConfigurationService } from "../services/configuration.service";

import { Response } from "jslib-node/cli/models/response";
import { StringResponse } from "jslib-node/cli/models/response/stringResponse";

export class LastSyncCommand {
  constructor(private configurationService: ConfigurationService) {}

  async run(object: string): Promise<Response> {
    try {
      switch (object.toLowerCase()) {
        case "groups":
          const groupsDate = await this.configurationService.getLastGroupSyncDate();
          const groupsRes = new StringResponse(
            groupsDate == null ? null : groupsDate.toISOString()
          );
          return Response.success(groupsRes);
        case "users":
          const usersDate = await this.configurationService.getLastUserSyncDate();
          const usersRes = new StringResponse(usersDate == null ? null : usersDate.toISOString());
          return Response.success(usersRes);
        default:
          return Response.badRequest("Unknown object.");
      }
    } catch (e) {
      return Response.error(e);
    }
  }
}
