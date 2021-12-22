import { ApiService } from "jslib-common/abstractions/api.service";
import { AppIdService } from "jslib-common/abstractions/appId.service";
import { CryptoService } from "jslib-common/abstractions/crypto.service";
import { CryptoFunctionService } from "jslib-common/abstractions/cryptoFunction.service";
import { EnvironmentService } from "jslib-common/abstractions/environment.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { KeyConnectorService } from "jslib-common/abstractions/keyConnector.service";
import { LogService } from "jslib-common/abstractions/log.service";
import { MessagingService } from "jslib-common/abstractions/messaging.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { StateService } from "../abstractions/state.service";
import { TokenService } from "jslib-common/abstractions/token.service";
import { VaultTimeoutService } from "jslib-common/abstractions/vaultTimeout.service";

import { AuthService as AuthServiceBase } from "jslib-common/services/auth.service";

import { Account, DirectoryConfigurations, DirectorySettings } from "src/models/account";

import { AccountKeys, AccountProfile, AccountTokens } from "jslib-common/models/domain/account";
import { AuthResult } from "jslib-common/models/domain/authResult";

import { DeviceRequest } from "jslib-common/models/request/deviceRequest";
import { TokenRequest } from "jslib-common/models/request/tokenRequest";

import { IdentityTokenResponse } from "jslib-common/models/response/identityTokenResponse";

export class AuthService extends AuthServiceBase {
  constructor(
    cryptoService: CryptoService,
    apiService: ApiService,
    tokenService: TokenService,
    appIdService: AppIdService,
    i18nService: I18nService,
    platformUtilsService: PlatformUtilsService,
    messagingService: MessagingService,
    vaultTimeoutService: VaultTimeoutService,
    logService: LogService,
    cryptoFunctionService: CryptoFunctionService,
    environmentService: EnvironmentService,
    keyConnectorService: KeyConnectorService,
    stateService: StateService
  ) {
    super(
      cryptoService,
      apiService,
      tokenService,
      appIdService,
      i18nService,
      platformUtilsService,
      messagingService,
      vaultTimeoutService,
      logService,
      cryptoFunctionService,
      keyConnectorService,
      environmentService,
      stateService,
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
    this.stateService.clean();
    super.logOut(callback);
  }

  private async organizationLogInHelper(clientId: string, clientSecret: string) {
    const appId = await this.appIdService.getAppId();
    const entityId = clientId.split("organization.")[1];
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
    await this.stateService.addAccount(
      new Account({
        profile: {
          ...new AccountProfile(),
          ...{
            userId: entityId,
            apiKeyClientId: clientId,
            entityId: entityId,
          },
        },
        tokens: {
          ...new AccountTokens(),
          ...{
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken,
          },
        },
        keys: {
          ...new AccountKeys(),
          ...{
            apiKeyClientSecret: clientSecret,
          },
        },
        directorySettings: new DirectorySettings(),
        directoryConfigurations: new DirectoryConfigurations(),
      })
    );
    return result;
  }
}
