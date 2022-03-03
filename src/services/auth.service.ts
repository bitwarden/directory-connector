import { ApiService } from "jslib-common/abstractions/api.service";
import { AppIdService } from "jslib-common/abstractions/appId.service";
import { CryptoService } from "jslib-common/abstractions/crypto.service";
import { EnvironmentService } from "jslib-common/abstractions/environment.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { KeyConnectorService } from "jslib-common/abstractions/keyConnector.service";
import { LogService } from "jslib-common/abstractions/log.service";
import { MessagingService } from "jslib-common/abstractions/messaging.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { TokenService } from "jslib-common/abstractions/token.service";
import { TwoFactorService } from "jslib-common/abstractions/twoFactor.service";
import { AuthResult } from "jslib-common/models/domain/authResult";
import { ApiLogInCredentials } from "jslib-common/models/domain/logInCredentials";
import { AuthService as AuthServiceBase } from "jslib-common/services/auth.service";

import { StateService } from "../abstractions/state.service";
import { OrganizationLogInStrategy } from "../misc/logInStrategies/organizationLogIn.strategy";

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
    twoFactorService: TwoFactorService,
    i18nService: I18nService
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
      twoFactorService,
      i18nService
    );
  }

  async logIn(credentials: ApiLogInCredentials): Promise<AuthResult> {
    const strategy = new OrganizationLogInStrategy(
      this.cryptoService,
      this.apiService,
      this.tokenService,
      this.appIdService,
      this.platformUtilsService,
      this.messagingService,
      this.logService,
      this.stateService,
      this.twoFactorService
    );

    return strategy.logIn(credentials);
  }
}
