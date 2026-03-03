import * as program from "commander";

import { StateService } from "@/libs/abstractions/state.service";

import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";

import { Response } from "@/src-cli/cli/models/response";
import { MessageResponse } from "@/src-cli/cli/models/response/messageResponse";

export class ClearCacheCommand {
  constructor(
    private i18nService: I18nService,
    private stateService: StateService,
  ) {}

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
