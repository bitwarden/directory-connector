import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';
import { TokenService } from 'jslib-common/abstractions/token.service';
import { NodeApiService as NodeApiServiceBase } from 'jslib-node/services/nodeApi.service';

export class NodeApiService extends NodeApiServiceBase {
    constructor(tokenService: TokenService, platformUtilsService: PlatformUtilsService,
        private refreshTokenCallback: () => Promise<void>, logoutCallback: (expired: boolean) => Promise<void>, customUserAgent: string = null) {
        super(tokenService, platformUtilsService, logoutCallback, customUserAgent);
    }

    doRefreshToken(): Promise<void> {
        return this.refreshTokenCallback();
    }
}
