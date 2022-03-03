import * as program from "commander";

import { I18nService } from "jslib-common/abstractions/i18n.service";
import { Response } from "jslib-node/cli/models/response";
import { MessageResponse } from "jslib-node/cli/models/response/messageResponse";

import { StateService } from "../abstractions/state.service";

export class ClearCacheCommand {
  constructor(private i18nService: I18nService, private stateService: StateService) {}

  async run(cmd: program.OptionValues): Promise<Response> {
    try {
      await this.stateService.clearSyncSettings(true);
      const res = new MessageResponse(this.i18nService.t("syncCacheCleared"), null);
      return Response.success(res);
    } catch (e) {
      return Response.error(e);
    }
  }
}
