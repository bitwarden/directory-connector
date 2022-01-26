import { OrganizationApiLogInDelegate } from "../misc/logInDelegate/organizationApiLogin.delegate";

import { ApiService } from "jslib-common/abstractions/api.service";
import { AppIdService } from "jslib-common/abstractions/appId.service";
import { CryptoService } from "jslib-common/abstractions/crypto.service";
import { EnvironmentService } from "jslib-common/abstractions/environment.service";
import { KeyConnectorService } from "jslib-common/abstractions/keyConnector.service";
import { LogService } from "jslib-common/abstractions/log.service";
import { MessagingService } from "jslib-common/abstractions/messaging.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { TokenService } from "jslib-common/abstractions/token.service";
import { TwoFactorService } from "jslib-common/abstractions/twoFactor.service";

import { AuthService as AuthServiceBase } from "jslib-common/services/auth.service";

import { AuthResult } from "jslib-common/models/domain/authResult";

import { StateService } from "../abstractions/state.service";

export class AuthService extends AuthServiceBase {
  constructor(
    cryptoService: CryptoService,
    apiService: ApiService,
    tokenService: TokenService,
    appIdService: AppIdService,
    platformUtilsService: PlatformUtilsService,
    messagingService: MessagingService,
    logService: LogService,
    keyConnectorService: KeyConnectorService,
    environmentService: EnvironmentService,
    stateService: StateService,
    twoFactorService: TwoFactorService
  ) {
    super(
      cryptoService,
      apiService,
      tokenService,
      appIdService,
      platformUtilsService,
      messagingService,
      logService,
      keyConnectorService,
      environmentService,
      stateService,
      twoFactorService
    );
  }

  async logInApiKey(clientId: string, clientSecret: string): Promise<AuthResult> {
    const apiLogInDelegate = await OrganizationApiLogInDelegate.new(
      this.cryptoService,
      this.apiService,
      this.tokenService,
      this.appIdService,
      this.platformUtilsService,
      this.messagingService,
      this.logService,
      this.stateService,
      this.twoFactorService,
      clientId,
      clientSecret,
      null
    );

    return this.startLogin(apiLogInDelegate);
  }

  async logOut(callback: Function) {
    this.stateService.clean();
    super.logOut(callback);
  }
}
