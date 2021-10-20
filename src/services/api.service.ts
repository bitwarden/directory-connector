import { ActiveAccountService } from 'jslib-common/abstractions/activeAccount.service';
import { AuthService } from 'jslib-common/abstractions/auth.service';
import { EnvironmentService } from 'jslib-common/abstractions/environment.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';
import { TokenService } from 'jslib-common/abstractions/token.service';

import { StorageKey } from 'jslib-common/enums/storageKey';

import { ApiService as ApiServiceBase } from 'jslib-common/services/api.service';

export async function refreshToken(activeAccount: ActiveAccountService, authService: AuthService) {
    try {
        const clientId = await activeAccount.getInformation<string>(StorageKey.ClientId);
        const clientSecret = await activeAccount.getInformation<string>(StorageKey.ClientSecret);
        if (clientId != null && clientSecret != null) {
            await authService.logInApiKey(clientId, clientSecret);
        }
    } catch (e) {
        return Promise.reject(e);
    }
}

export class ApiService extends ApiServiceBase {
    constructor(tokenService: TokenService, platformUtilsService: PlatformUtilsService, environmentService: EnvironmentService,
        private refreshTokenCallback: () => Promise<void>, logoutCallback: (expired: boolean) => Promise<void>,
        customUserAgent: string = null) {
        super(tokenService, platformUtilsService, environmentService, logoutCallback, customUserAgent);
    }

    doRefreshToken(): Promise<void> {
        return this.refreshTokenCallback();
    }
}
