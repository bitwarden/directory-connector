import { LogInStrategy } from "@/jslib/common/src/misc/logInStrategies/logIn.strategy";
import {
  AccountKeys,
  AccountProfile,
  AccountTokens,
} from "@/jslib/common/src/models/domain/account";
import { AuthResult } from "@/jslib/common/src/models/domain/authResult";
import { ApiLogInCredentials } from "@/jslib/common/src/models/domain/logInCredentials";
import { ApiTokenRequest } from "@/jslib/common/src/models/request/identityToken/apiTokenRequest";
import { IdentityTokenResponse } from "@/jslib/common/src/models/response/identityTokenResponse";
import { Account, DirectoryConfigurations, DirectorySettings } from "@/src/models/account";

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
