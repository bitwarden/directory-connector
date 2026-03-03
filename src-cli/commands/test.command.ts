import * as program from "commander";

import { TestResponse } from "@/libs/models/response/testResponse";
import { SyncService } from "@/libs/services/sync.service";
import { ConnectorUtils } from "@/libs/utils";

import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";

import { Response } from "@/src-cli/cli/models/response";

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
