import * as program from 'commander';

import { EnvironmentService } from 'jslib/abstractions/environment.service';
import { I18nService } from 'jslib/abstractions/i18n.service';

import { Response } from 'jslib/cli/models/response';
import { MessageResponse } from 'jslib/cli/models/response/messageResponse';

export class ConfigCommand {
    constructor(private environmentService: EnvironmentService, private i18nService: I18nService) { }

    async run(setting: string, value: string, cmd: program.Command): Promise<Response> {
        setting = setting.toLowerCase();
        switch (setting) {
            case 'server':
                await this.setServer(value);
                break;
            default:
                return Response.badRequest('Unknown setting.');
        }

        const res = new MessageResponse(this.i18nService.t('savedSetting', setting), null);
        return Response.success(res);
    }

    private async setServer(url: string) {
        url = (url === 'null' || url === 'bitwarden.com' || url === 'https://bitwarden.com' ? null : url);
        await this.environmentService.setUrls({
            base: url,
        });
    }
}
