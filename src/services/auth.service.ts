import { StateService } from "../abstractions/state.service";
import { OrganizationLogInStrategy } from "../misc/logInStrategies/organizationLogIn.strategy";

import { ApiService } from "@/jslib/common/src/abstractions/api.service";
import { AppIdService } from "@/jslib/common/src/abstractions/appId.service";
import { CryptoService } from "@/jslib/common/src/abstractions/crypto.service";
import { EnvironmentService } from "@/jslib/common/src/abstractions/environment.service";
import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { KeyConnectorService } from "@/jslib/common/src/abstractions/keyConnector.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { PlatformUtilsService } from "@/jslib/common/src/abstractions/platformUtils.service";
import { TokenService } from "@/jslib/common/src/abstractions/token.service";
import { TwoFactorService } from "@/jslib/common/src/abstractions/twoFactor.service";
import { AuthResult } from "@/jslib/common/src/models/domain/authResult";
import { ApiLogInCredentials } from "@/jslib/common/src/models/domain/logInCredentials";
import { AuthService as AuthServiceBase } from "@/jslib/common/src/services/auth.service";

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
