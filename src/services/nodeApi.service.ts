import { EnvironmentService } from 'jslib-common/abstractions/environment.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';
import { TokenService } from 'jslib-common/abstractions/token.service';

import { NodeApiService as NodeApiServiceBase } from 'jslib-node/services/nodeApi.service';

export class NodeApiService extends NodeApiServiceBase {
    constructor(tokenService: TokenService, platformUtilsService: PlatformUtilsService, environmentService: EnvironmentService,
        private refreshTokenCallback: () => Promise<void>, logoutCallback: (expired: boolean) => Promise<void>,
        customUserAgent: string = null, apiKeyRefresh: (clientId: string, clientSecret: string) => Promise<any>) {
        super(tokenService, platformUtilsService, environmentService, logoutCallback, customUserAgent, apiKeyRefresh);
    }

    doRefreshToken(): Promise<void> {
        return this.refreshTokenCallback();
    }
}
