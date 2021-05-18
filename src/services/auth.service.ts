import { ApiService } from 'jslib/abstractions/api.service';
import { ApiKeyService } from 'jslib/abstractions/apiKey.service';
import { AppIdService } from 'jslib/abstractions/appId.service';
import { CryptoService } from 'jslib/abstractions/crypto.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { LogService } from 'jslib/abstractions/log.service';
import { MessagingService } from 'jslib/abstractions/messaging.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';
import { TokenService } from 'jslib/abstractions/token.service';
import { UserService } from 'jslib/abstractions/user.service';
import { VaultTimeoutService } from 'jslib/abstractions/vaultTimeout.service';

import { AuthService as AuthServiceBase } from 'jslib/services/auth.service';

import { AuthResult } from 'jslib/models/domain';
import { DeviceRequest } from 'jslib/models/request/deviceRequest';
import { TokenRequest } from 'jslib/models/request/tokenRequest';
import { IdentityTokenResponse } from 'jslib/models/response/identityTokenResponse';

export class AuthService extends AuthServiceBase {

    constructor(cryptoService: CryptoService, apiService: ApiService, userService: UserService,
        tokenService: TokenService, appIdService: AppIdService, i18nService: I18nService,
        platformUtilsService: PlatformUtilsService, messagingService: MessagingService,
        vaultTimeoutService: VaultTimeoutService, logService: LogService, private apiKeyService: ApiKeyService,
        setCryptoKeys = true) {
        super(cryptoService, apiService, userService, tokenService, appIdService, i18nService, platformUtilsService,
            messagingService, vaultTimeoutService, logService, setCryptoKeys);
    }

    async logInApiKey(clientId: string, clientSecret: string): Promise<AuthResult> {
        this.selectedTwoFactorProviderType = null;
        if (clientId.startsWith('organization')) {
            return await this.organizationLogInHelper(clientId, clientSecret);
        }
        return await super.logInApiKey(clientId, clientSecret);
    }

    private async organizationLogInHelper(clientId: string, clientSecret: string) {
        const appId = await this.appIdService.getAppId();
        const deviceRequest = new DeviceRequest(appId, this.platformUtilsService);
        const request = new TokenRequest(null, null, [clientId, clientSecret], null,
            null, false, deviceRequest);

        const response = await this.apiService.postIdentityToken(request);
        const result = new AuthResult();
        result.twoFactor = !(response as any).accessToken;

        const tokenResponse = response as IdentityTokenResponse;
        result.resetMasterPassword = tokenResponse.resetMasterPassword;
        await this.tokenService.setToken(tokenResponse.accessToken);
        await this.apiKeyService.setInformation(clientId);

        return result;
    }
}
