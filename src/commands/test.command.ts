import * as program from "commander";

import { I18nService } from "jslib-common/abstractions/i18n.service";

import { SyncService } from "../services/sync.service";

import { ConnectorUtils } from "../utils";

import { Response } from "jslib-node/cli/models/response";
import { TestResponse } from "../models/response/testResponse";

export class TestCommand {
    constructor(private syncService: SyncService, private i18nService: I18nService) {}

    async run(cmd: program.OptionValues): Promise<Response> {
        try {
            const result = await ConnectorUtils.simulate(
                this.syncService,
                this.i18nService,
                cmd.last || false
            );
            const res = new TestResponse(result);
            return Response.success(res);
        } catch (e) {
            return Response.error(e);
        }
    }
}
