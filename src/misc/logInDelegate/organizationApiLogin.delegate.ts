import { LogInDelegate } from 'jslib-common/misc/logInDelegate/logIn.delegate';

import { ApiService } from 'jslib-common/abstractions/api.service';
import { AppIdService } from 'jslib-common/abstractions/appId.service';
import { CryptoService } from 'jslib-common/abstractions/crypto.service';
import { LogService } from 'jslib-common/abstractions/log.service';
import { MessagingService } from 'jslib-common/abstractions/messaging.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';
import { StateService } from 'jslib-common/abstractions/state.service';
import { TokenService } from 'jslib-common/abstractions/token.service';
import { TwoFactorService } from 'jslib-common/abstractions/twoFactor.service';

import { ApiTokenRequest } from 'jslib-common/models/request/identityToken/apiTokenRequest';
import { TokenRequestTwoFactor } from 'jslib-common/models/request/identityToken/tokenRequest';

import { IdentityTokenResponse } from 'jslib-common/models/response/identityTokenResponse';

import { AuthResult } from 'jslib-common/models/domain/authResult';
import { AccountKeys, AccountProfile, AccountTokens } from 'jslib-common/models/domain/account';

import { Account, DirectoryConfigurations, DirectorySettings } from 'src/models/account';

export class OrganizationApiLogInDelegate extends LogInDelegate {
  static async new(
    cryptoService: CryptoService,
    apiService: ApiService,
    tokenService: TokenService,
    appIdService: AppIdService,
    platformUtilsService: PlatformUtilsService,
    messagingService: MessagingService,
    logService: LogService,
    stateService: StateService,
    twoFactorService: TwoFactorService,
    clientId: string,
    clientSecret: string,
    twoFactor?: TokenRequestTwoFactor
  ): Promise<OrganizationApiLogInDelegate> {
    const delegate = new OrganizationApiLogInDelegate(
      cryptoService,
      apiService,
      tokenService,
      appIdService,
      platformUtilsService,
      messagingService,
      logService,
      stateService,
      twoFactorService,
      false
    );
    await delegate.init(clientId, clientSecret, twoFactor);
    return delegate;
  }

  tokenRequest: ApiTokenRequest;

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

  private async init(clientId: string, clientSecret: string, twoFactor?: TokenRequestTwoFactor) {
    this.tokenRequest = new ApiTokenRequest(
      clientId,
      clientSecret,
      await this.buildTwoFactor(twoFactor),
      await this.buildDeviceRequest()
    );
  }
}
