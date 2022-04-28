import { ApiService } from "../../abstractions/api.service";
import { AppIdService } from "../../abstractions/appId.service";
import { CryptoService } from "../../abstractions/crypto.service";
import { EnvironmentService } from "../../abstractions/environment.service";
import { KeyConnectorService } from "../../abstractions/keyConnector.service";
import { LogService } from "../../abstractions/log.service";
import { MessagingService } from "../../abstractions/messaging.service";
import { PlatformUtilsService } from "../../abstractions/platformUtils.service";
import { StateService } from "../../abstractions/state.service";
import { TokenService } from "../../abstractions/token.service";
import { TwoFactorService } from "../../abstractions/twoFactor.service";
import { ApiLogInCredentials } from "../../models/domain/logInCredentials";
import { ApiTokenRequest } from "../../models/request/identityToken/apiTokenRequest";
import { IdentityTokenResponse } from "../../models/response/identityTokenResponse";

import { LogInStrategy } from "./logIn.strategy";

export class ApiLogInStrategy extends LogInStrategy {
  tokenRequest: ApiTokenRequest;

  constructor(
    cryptoService: CryptoService,
    apiService: ApiService,
    tokenService: TokenService,
    appIdService: AppIdService,
    platformUtilsService: PlatformUtilsService,
    messagingService: MessagingService,
    logService: LogService,
    stateService: StateService,
    twoFactorService: TwoFactorService,
    private environmentService: EnvironmentService,
    private keyConnectorService: KeyConnectorService
  ) {
    super(
      cryptoService,
      apiService,
      tokenService,
      appIdService,
      platformUtilsService,
      messagingService,
      logService,
      stateService,
      twoFactorService
    );
  }

  async onSuccessfulLogin(tokenResponse: IdentityTokenResponse) {
    if (tokenResponse.apiUseKeyConnector) {
      const keyConnectorUrl = this.environmentService.getKeyConnectorUrl();
      await this.keyConnectorService.getAndSetKey(keyConnectorUrl);
    }
  }

  async logIn(credentials: ApiLogInCredentials) {
    this.tokenRequest = new ApiTokenRequest(
      credentials.clientId,
      credentials.clientSecret,
      await this.buildTwoFactor(),
      await this.buildDeviceRequest()
    );

    return this.startLogIn();
  }

  protected async saveAccountInformation(tokenResponse: IdentityTokenResponse) {
    await super.saveAccountInformation(tokenResponse);
    await this.stateService.setApiKeyClientId(this.tokenRequest.clientId);
    await this.stateService.setApiKeyClientSecret(this.tokenRequest.clientSecret);
  }
}
