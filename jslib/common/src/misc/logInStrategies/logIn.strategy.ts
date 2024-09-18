import { Account, DirectoryConfigurations, DirectorySettings } from "@/src/models/account";

import { ApiService } from "../../abstractions/api.service";
import { AppIdService } from "../../abstractions/appId.service";
import { PlatformUtilsService } from "../../abstractions/platformUtils.service";
import { StateService } from "../../abstractions/state.service";
import { AccountKeys, AccountProfile, AccountTokens } from "../../models/domain/account";
import { AuthResult } from "../../models/domain/authResult";
import { ApiLogInCredentials } from "../../models/domain/logInCredentials";
import { DeviceRequest } from "../../models/request/deviceRequest";
import { ApiTokenRequest } from "../../models/request/identityToken/apiTokenRequest";
import { TokenRequestTwoFactor } from "../../models/request/identityToken/tokenRequestTwoFactor";
import { IdentityTokenResponse } from "../../models/response/identityTokenResponse";

export class LogInStrategy {
  private tokenRequest: ApiTokenRequest;

  constructor(
    private apiService: ApiService,
    private appIdService: AppIdService,
    private platformUtilsService: PlatformUtilsService,
    private stateService: StateService,
  ) {}

  async logIn(credentials: ApiLogInCredentials) {
    this.tokenRequest = new ApiTokenRequest(
      credentials.clientId,
      credentials.clientSecret,
      new TokenRequestTwoFactor(),  // unused
      await this.buildDeviceRequest(),
    );

    const response = await this.apiService.postIdentityToken(this.tokenRequest);

    if (response instanceof IdentityTokenResponse) {
      await this.saveAccountInformation(response);
      return new AuthResult();
    }

    throw new Error("Invalid response object.");
  }

  private async buildDeviceRequest() {
    const appId = await this.appIdService.getAppId();
    return new DeviceRequest(appId, this.platformUtilsService);
  }

  private async saveAccountInformation(tokenResponse: IdentityTokenResponse) {
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
}
