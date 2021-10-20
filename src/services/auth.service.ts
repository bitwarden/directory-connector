import { ApiService } from 'jslib-common/abstractions/api.service';
import { AccountsManagementService } from 'jslib-common/abstractions/accountsManagement.service';
import { AppIdService } from 'jslib-common/abstractions/appId.service';
import { CryptoService } from 'jslib-common/abstractions/crypto.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { LogService } from 'jslib-common/abstractions/log.service';
import { MessagingService } from 'jslib-common/abstractions/messaging.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';
import { TokenService } from 'jslib-common/abstractions/token.service';
import { VaultTimeoutService } from 'jslib-common/abstractions/vaultTimeout.service';

import { AuthService as AuthServiceBase } from 'jslib-common/services/auth.service';

import { AuthResult } from 'jslib-common/models/domain/authResult';
import { DeviceRequest } from 'jslib-common/models/request/deviceRequest';
import { TokenRequest } from 'jslib-common/models/request/tokenRequest';
import { IdentityTokenResponse } from 'jslib-common/models/response/identityTokenResponse';
import { ActiveAccountService } from 'jslib-common/abstractions/activeAccount.service';
import { Account } from 'jslib-common/models/domain/account';

export class AuthService extends AuthServiceBase {

    constructor(cryptoService: CryptoService, apiService: ApiService, 
        tokenService: TokenService, appIdService: AppIdService,
        i18nService: I18nService, platformUtilsService: PlatformUtilsService,
        messagingService: MessagingService, vaultTimeoutService: VaultTimeoutService,
        logService: LogService,  accountsManagementService: AccountsManagementService,
        activeAccount: ActiveAccountService, setCryptoKeys = true) {
        super(cryptoService, apiService, tokenService, appIdService,
            i18nService, platformUtilsService, messagingService, vaultTimeoutService,
            logService, activeAccount, accountsManagementService, setCryptoKeys);
    }

    async logInApiKey(clientId: string, clientSecret: string): Promise<AuthResult> {
        this.selectedTwoFactorProviderType = null;
        if (clientId.startsWith('organization')) {
            return await this.organizationLogInHelper(clientId, clientSecret);
        }
        return await super.logInApiKey(clientId, clientSecret);
    }

    async logOut(callback: Function) {
        this.accountsManagementService.remove(this.activeAccount.userId);
        super.logOut(callback);
    }

    private async organizationLogInHelper(clientId: string, clientSecret: string) {
        const appId = await this.appIdService.getAppId();
        const deviceRequest = new DeviceRequest(appId, this.platformUtilsService);
        const request = new TokenRequest(null, null, [clientId, clientSecret], null,
            null, false, null, deviceRequest);

        const response = await this.apiService.postIdentityToken(request);
        const result = new AuthResult();
        result.twoFactor = !(response as any).accessToken;

        const tokenResponse = response as IdentityTokenResponse;
        result.resetMasterPassword = tokenResponse.resetMasterPassword;
        await this.tokenService.setToken(tokenResponse.accessToken);
        const accountInformation = await this.tokenService.decodeToken(tokenResponse.accessToken);
        await this.accountsManagementService.add(new Account(
            accountInformation.client_id, accountInformation.email,
            tokenResponse.kdf, tokenResponse.kdfIterations,
            clientId, clientSecret, tokenResponse.accessToken, tokenResponse.refreshToken));

        return result;
    }
}
