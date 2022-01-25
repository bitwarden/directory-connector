import { ApiLogInDelegate as BaseApiLogInDelegate } from "jslib-common/misc/logInDelegate/apiLogin.delegate";

import { IdentityTokenResponse } from 'jslib-common/models/response/identityTokenResponse';

import { AccountKeys, AccountProfile, AccountTokens } from 'jslib-common/models/domain/account';

import { Account, DirectoryConfigurations, DirectorySettings } from 'src/models/account';
import { AuthResult } from 'jslib-common/models/domain/authResult';

export class OrganizationApiLogInDelegate extends BaseApiLogInDelegate {
  async onSuccessfulLogin(tokenResponse: IdentityTokenResponse) {
    // Not called, but do nothing just to make sure
  }

  protected async processTokenResponse(response: IdentityTokenResponse): Promise<AuthResult> {
    const result = new AuthResult();

    await this.saveAccountInformation(response);

    this.messagingService.send("loggedIn");
    return result;
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
