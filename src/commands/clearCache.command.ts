import * as program from 'commander';

import { I18nService } from 'jslib-common/abstractions/i18n.service';

import { ConfigurationService } from '../services/configuration.service';

import { Response } from 'jslib-node/cli/models/response';
import { MessageResponse } from 'jslib-node/cli/models/response/messageResponse';

export class ClearCacheCommand {
    constructor(private configurationService: ConfigurationService, private i18nService: I18nService) { }

    async run(cmd: program.OptionValues): Promise<Response> {
        try {
            await this.configurationService.clearStatefulSettings(true);
            const res = new MessageResponse(this.i18nService.t('syncCacheCleared'), null);
            return Response.success(res);
        } catch (e) {
            return Response.error(e);
        }
    }
}
