import { ApiKeyService } from 'jslib-common/abstractions/apiKey.service';
import { AuthService } from 'jslib-common/abstractions/auth.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';
import { TokenService } from 'jslib-common/abstractions/token.service';

import { ApiService as ApiServiceBase } from 'jslib-common/services/api.service';

export async function refreshToken(apiKeyService: ApiKeyService, authService: AuthService) {
    try {
        const clientId = await apiKeyService.getClientId();
        const clientSecret = await apiKeyService.getClientSecret();
        if (clientId != null && clientSecret != null) {
            await authService.logInApiKey(clientId, clientSecret);
        }
    } catch (e) {
        return Promise.reject(e);
    }
}

export class ApiService extends ApiServiceBase {
    constructor(tokenService: TokenService, platformUtilsService: PlatformUtilsService,
        private refreshTokenCallback: () => Promise<void>, logoutCallback: (expired: boolean) => Promise<void>,
        customUserAgent: string = null) {
        super(tokenService, platformUtilsService, logoutCallback, customUserAgent);
    }

    doRefreshToken(): Promise<void> {
        return this.refreshTokenCallback();
    }
}
