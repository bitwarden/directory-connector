import { LogInStrategy } from "jslib-common/misc/logInStrategies/logIn.strategy";

import { ApiTokenRequest } from "jslib-common/models/request/identityToken/apiTokenRequest";

import { IdentityTokenResponse } from "jslib-common/models/response/identityTokenResponse";

import { AccountKeys, AccountProfile, AccountTokens } from "jslib-common/models/domain/account";
import { AuthResult } from "jslib-common/models/domain/authResult";
import { ApiLogInCredentials } from "jslib-common/models/domain/logInCredentials";

import { Account, DirectoryConfigurations, DirectorySettings } from "src/models/account";

export class OrganizationLogInStrategy extends LogInStrategy {
  tokenRequest: ApiTokenRequest;

  async logIn(credentials: ApiLogInCredentials) {
    this.tokenRequest = new ApiTokenRequest(
      credentials.clientId,
      credentials.clientSecret,
      await this.buildTwoFactor(),
      await this.buildDeviceRequest()
    );

    return this.startLogIn();
  }

  protected async processTokenResponse(response: IdentityTokenResponse): Promise<AuthResult> {
    await this.saveAccountInformation(response);
    return new AuthResult();
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
      })
    );
  }
}
