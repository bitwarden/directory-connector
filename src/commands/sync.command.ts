import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { Response } from "@/jslib/node/src/cli/models/response";
import { MessageResponse } from "@/jslib/node/src/cli/models/response/messageResponse";

import { SyncService } from "../services/sync.service";

export class SyncCommand {
  constructor(private syncService: SyncService, private i18nService: I18nService) {}

  async run(): Promise<Response> {
    try {
      const result = await this.syncService.sync(false, false);
      const groupCount = result[0] != null ? result[0].length : 0;
      const userCount = result[1] != null ? result[1].length : 0;
      const res = new MessageResponse(
        this.i18nService.t("syncingComplete"),
        this.i18nService.t("syncCounts", groupCount.toString(), userCount.toString())
      );
      return Response.success(res);
    } catch (e) {
      return Response.error(e);
    }
  }
}
