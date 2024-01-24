import * as program from "commander";

import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { Response } from "@/jslib/node/src/cli/models/response";

import { TestResponse } from "../models/response/testResponse";
import { SyncService } from "../services/sync.service";
import { ConnectorUtils } from "../utils";

export class TestCommand {
  constructor(
    private syncService: SyncService,
    private i18nService: I18nService,
  ) {}

  async run(cmd: program.OptionValues): Promise<Response> {
    try {
      const result = await ConnectorUtils.simulate(
        this.syncService,
        this.i18nService,
        cmd.last || false,
      );
      const res = new TestResponse(result);
      return Response.success(res);
    } catch (e) {
      return Response.error(e);
    }
  }
}
