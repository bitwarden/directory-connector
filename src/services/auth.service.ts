import { ApiService } from "jslib-common/abstractions/api.service";
import { ApiKeyService } from "jslib-common/abstractions/apiKey.service";
import { AppIdService } from "jslib-common/abstractions/appId.service";
import { CryptoService } from "jslib-common/abstractions/crypto.service";
import { CryptoFunctionService } from "jslib-common/abstractions/cryptoFunction.service";
import { EnvironmentService } from "jslib-common/abstractions/environment.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { KeyConnectorService } from "jslib-common/abstractions/keyConnector.service";
import { LogService } from "jslib-common/abstractions/log.service";
import { MessagingService } from "jslib-common/abstractions/messaging.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { TokenService } from "jslib-common/abstractions/token.service";
import { UserService } from "jslib-common/abstractions/user.service";
import { VaultTimeoutService } from "jslib-common/abstractions/vaultTimeout.service";

import { AuthService as AuthServiceBase } from "jslib-common/services/auth.service";

import { AuthResult } from "jslib-common/models/domain/authResult";
import { DeviceRequest } from "jslib-common/models/request/deviceRequest";
import { TokenRequest } from "jslib-common/models/request/tokenRequest";
import { IdentityTokenResponse } from "jslib-common/models/response/identityTokenResponse";

export class AuthService extends AuthServiceBase {
    constructor(
        cryptoService: CryptoService,
        apiService: ApiService,
        userService: UserService,
        tokenService: TokenService,
        appIdService: AppIdService,
        i18nService: I18nService,
        platformUtilsService: PlatformUtilsService,
        messagingService: MessagingService,
        vaultTimeoutService: VaultTimeoutService,
        logService: LogService,
        private apiKeyService: ApiKeyService,
        cryptoFunctionService: CryptoFunctionService,
        environmentService: EnvironmentService,
        keyConnectorService: KeyConnectorService
    ) {
        super(
            cryptoService,
            apiService,
            userService,
            tokenService,
            appIdService,
            i18nService,
            platformUtilsService,
            messagingService,
            vaultTimeoutService,
            logService,
            cryptoFunctionService,
            environmentService,
            keyConnectorService,
            false
        );
    }

    async logInApiKey(clientId: string, clientSecret: string): Promise<AuthResult> {
        this.selectedTwoFactorProviderType = null;
        if (clientId.startsWith("organization")) {
            return await this.organizationLogInHelper(clientId, clientSecret);
        }
        return await super.logInApiKey(clientId, clientSecret);
    }

    async logOut(callback: Function) {
        this.apiKeyService.clear();
        super.logOut(callback);
    }

    private async organizationLogInHelper(clientId: string, clientSecret: string) {
        const appId = await this.appIdService.getAppId();
        const deviceRequest = new DeviceRequest(appId, this.platformUtilsService);
        const request = new TokenRequest(
            null,
            null,
            [clientId, clientSecret],
            null,
            null,
            false,
            null,
            deviceRequest
        );

        const response = await this.apiService.postIdentityToken(request);
        const result = new AuthResult();
        result.twoFactor = !(response as any).accessToken;

        const tokenResponse = response as IdentityTokenResponse;
        result.resetMasterPassword = tokenResponse.resetMasterPassword;
        await this.tokenService.setToken(tokenResponse.accessToken);
        await this.apiKeyService.setInformation(clientId, clientSecret);

        return result;
    }
}
