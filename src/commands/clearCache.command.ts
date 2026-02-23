import * as program from "commander";

import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { Response } from "@/jslib/node/src/cli/models/response";
import { MessageResponse } from "@/jslib/node/src/cli/models/response/messageResponse";

import { StateServiceVNext } from "../abstractions/state-vNext.service";

export class ClearCacheCommand {
  constructor(
    private i18nService: I18nService,
    private stateService: StateServiceVNext,
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
