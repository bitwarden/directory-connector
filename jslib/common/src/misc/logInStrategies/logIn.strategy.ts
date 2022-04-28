import { ApiService } from "../../abstractions/api.service";
import { AppIdService } from "../../abstractions/appId.service";
import { CryptoService } from "../../abstractions/crypto.service";
import { LogService } from "../../abstractions/log.service";
import { MessagingService } from "../../abstractions/messaging.service";
import { PlatformUtilsService } from "../../abstractions/platformUtils.service";
import { StateService } from "../../abstractions/state.service";
import { TokenService } from "../../abstractions/token.service";
import { TwoFactorService } from "../../abstractions/twoFactor.service";
import { TwoFactorProviderType } from "../../enums/twoFactorProviderType";
import { Account, AccountProfile, AccountTokens } from "../../models/domain/account";
import { AuthResult } from "../../models/domain/authResult";
import {
  ApiLogInCredentials,
  PasswordLogInCredentials,
  SsoLogInCredentials,
} from "../../models/domain/logInCredentials";
import { DeviceRequest } from "../../models/request/deviceRequest";
import { ApiTokenRequest } from "../../models/request/identityToken/apiTokenRequest";
import { PasswordTokenRequest } from "../../models/request/identityToken/passwordTokenRequest";
import { SsoTokenRequest } from "../../models/request/identityToken/ssoTokenRequest";
import { TokenRequestTwoFactor } from "../../models/request/identityToken/tokenRequestTwoFactor";
import { KeysRequest } from "../../models/request/keysRequest";
import { IdentityCaptchaResponse } from "../../models/response/identityCaptchaResponse";
import { IdentityTokenResponse } from "../../models/response/identityTokenResponse";
import { IdentityTwoFactorResponse } from "../../models/response/identityTwoFactorResponse";

export abstract class LogInStrategy {
  protected abstract tokenRequest: ApiTokenRequest | PasswordTokenRequest | SsoTokenRequest;
  protected captchaBypassToken: string = null;

  constructor(
    protected cryptoService: CryptoService,
    protected apiService: ApiService,
    protected tokenService: TokenService,
    protected appIdService: AppIdService,
    protected platformUtilsService: PlatformUtilsService,
    protected messagingService: MessagingService,
    protected logService: LogService,
    protected stateService: StateService,
    protected twoFactorService: TwoFactorService
  ) {}

  abstract logIn(
    credentials: ApiLogInCredentials | PasswordLogInCredentials | SsoLogInCredentials
  ): Promise<AuthResult>;

  async logInTwoFactor(
    twoFactor: TokenRequestTwoFactor,
    captchaResponse: string = null
  ): Promise<AuthResult> {
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
    const accountInformation = await this.tokenService.decodeToken(tokenResponse.accessToken);
    await this.stateService.addAccount(
      new Account({
        profile: {
          ...new AccountProfile(),
          ...{
            userId: accountInformation.sub,
            email: accountInformation.email,
            hasPremiumPersonally: accountInformation.premium,
            kdfIterations: tokenResponse.kdfIterations,
            kdfType: tokenResponse.kdf,
          },
        },
        tokens: {
          ...new AccountTokens(),
          ...{
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken,
          },
        },
      })
    );
  }

  protected async processTokenResponse(response: IdentityTokenResponse): Promise<AuthResult> {
    const result = new AuthResult();
    result.resetMasterPassword = response.resetMasterPassword;
    result.forcePasswordReset = response.forcePasswordReset;

    await this.saveAccountInformation(response);

    if (response.twoFactorToken != null) {
      await this.tokenService.setTwoFactorToken(response);
    }

    const newSsoUser = response.key == null;
    if (!newSsoUser) {
      await this.cryptoService.setEncKey(response.key);
      await this.cryptoService.setEncPrivateKey(
        response.privateKey ?? (await this.createKeyPairForOldAccount())
      );
    }

    await this.onSuccessfulLogin(response);

    await this.stateService.setBiometricLocked(false);
    this.messagingService.send("loggedIn");

    return result;
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

  private async createKeyPairForOldAccount() {
    try {
      const [publicKey, privateKey] = await this.cryptoService.makeKeyPair();
      await this.apiService.postAccountKeys(new KeysRequest(publicKey, privateKey.encryptedString));
      return privateKey.encryptedString;
    } catch (e) {
      this.logService.error(e);
    }
  }
}
