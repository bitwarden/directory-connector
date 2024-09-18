import { Account, DirectoryConfigurations, DirectorySettings } from "@/src/models/account";

import { ApiService } from "../../abstractions/api.service";
import { AppIdService } from "../../abstractions/appId.service";
import { PlatformUtilsService } from "../../abstractions/platformUtils.service";
import { StateService } from "../../abstractions/state.service";
import { TokenService } from "../../abstractions/token.service";
import { TwoFactorService } from "../../abstractions/twoFactor.service";
import { TwoFactorProviderType } from "../../enums/twoFactorProviderType";
import { AccountKeys, AccountProfile, AccountTokens } from "../../models/domain/account";
import { AuthResult } from "../../models/domain/authResult";
import { ApiLogInCredentials } from "../../models/domain/logInCredentials";
import { DeviceRequest } from "../../models/request/deviceRequest";
import { ApiTokenRequest } from "../../models/request/identityToken/apiTokenRequest";
import { TokenRequestTwoFactor } from "../../models/request/identityToken/tokenRequestTwoFactor";
import { IdentityCaptchaResponse } from "../../models/response/identityCaptchaResponse";
import { IdentityTokenResponse } from "../../models/response/identityTokenResponse";
import { IdentityTwoFactorResponse } from "../../models/response/identityTwoFactorResponse";

export class LogInStrategy {
  protected tokenRequest: ApiTokenRequest;
  protected captchaBypassToken: string = null;

  constructor(
    private apiService: ApiService,
    private tokenService: TokenService,
    private appIdService: AppIdService,
    private platformUtilsService: PlatformUtilsService,
    private stateService: StateService,
    private twoFactorService: TwoFactorService,
  ) {}

  async logIn(credentials: ApiLogInCredentials) {
    this.tokenRequest = new ApiTokenRequest(
      credentials.clientId,
      credentials.clientSecret,
      await this.buildTwoFactor(),
      await this.buildDeviceRequest(),
    );

    return this.startLogIn();
  }

  async logInTwoFactor(twoFactor: TokenRequestTwoFactor): Promise<AuthResult> {
    this.tokenRequest.setTwoFactor(twoFactor);
    return this.startLogIn();
  }

  protected async startLogIn(): Promise<AuthResult> {
    this.twoFactorService.clearSelectedProvider();

    const response = await this.apiService.postIdentityToken(this.tokenRequest);

    if (response instanceof IdentityTwoFactorResponse) {
      return this.processTwoFactorResponse(response);
    } else if (response instanceof IdentityCaptchaResponse) {
      return this.processCaptchaResponse(response);
    } else if (response instanceof IdentityTokenResponse) {
      return this.processTokenResponse(response);
    }

    throw new Error("Invalid response object.");
  }

  protected onSuccessfulLogin(response: IdentityTokenResponse): Promise<void> {
    // Implemented in subclass if required
    return null;
  }

  protected async buildDeviceRequest() {
    const appId = await this.appIdService.getAppId();
    return new DeviceRequest(appId, this.platformUtilsService);
  }

  protected async buildTwoFactor(userProvidedTwoFactor?: TokenRequestTwoFactor) {
    if (userProvidedTwoFactor != null) {
      return userProvidedTwoFactor;
    }

    const storedTwoFactorToken = await this.tokenService.getTwoFactorToken();
    if (storedTwoFactorToken != null) {
      return new TokenRequestTwoFactor(TwoFactorProviderType.Remember, storedTwoFactorToken, false);
    }

    return new TokenRequestTwoFactor();
  }

  protected async saveAccountInformation(tokenResponse: IdentityTokenResponse) {
    const clientId = this.tokenRequest.clientId;
    const entityId = clientId.split("organization.")[1];
    const clientSecret = this.tokenRequest.clientSecret;

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
      }),
    );
  }

  protected async processTokenResponse(response: IdentityTokenResponse): Promise<AuthResult> {
    await this.saveAccountInformation(response);
    return new AuthResult();
  }

  private async processTwoFactorResponse(response: IdentityTwoFactorResponse): Promise<AuthResult> {
    const result = new AuthResult();
    result.twoFactorProviders = response.twoFactorProviders2;
    this.twoFactorService.setProviders(response);
    this.captchaBypassToken = response.captchaToken ?? null;
    return result;
  }

  private async processCaptchaResponse(response: IdentityCaptchaResponse): Promise<AuthResult> {
    const result = new AuthResult();
    result.captchaSiteKey = response.siteKey;
    return result;
  }
}
