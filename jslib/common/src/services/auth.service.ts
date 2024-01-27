import { ApiService } from "../abstractions/api.service";
import { AppIdService } from "../abstractions/appId.service";
import { AuthService as AuthServiceAbstraction } from "../abstractions/auth.service";
import { CryptoService } from "../abstractions/crypto.service";
import { EnvironmentService } from "../abstractions/environment.service";
import { I18nService } from "../abstractions/i18n.service";
import { KeyConnectorService } from "../abstractions/keyConnector.service";
import { LogService } from "../abstractions/log.service";
import { MessagingService } from "../abstractions/messaging.service";
import { PlatformUtilsService } from "../abstractions/platformUtils.service";
import { StateService } from "../abstractions/state.service";
import { TokenService } from "../abstractions/token.service";
import { TwoFactorService } from "../abstractions/twoFactor.service";
import { AuthenticationType } from "../enums/authenticationType";
import { KdfType } from "../enums/kdfType";
import { ApiLogInStrategy } from "../misc/logInStrategies/apiLogin.strategy";
import { PasswordLogInStrategy } from "../misc/logInStrategies/passwordLogin.strategy";
import { SsoLogInStrategy } from "../misc/logInStrategies/ssoLogin.strategy";
import { AuthResult } from "../models/domain/authResult";
import {
  ApiLogInCredentials,
  PasswordLogInCredentials,
  SsoLogInCredentials,
} from "../models/domain/logInCredentials";
import { SymmetricCryptoKey } from "../models/domain/symmetricCryptoKey";
import { TokenRequestTwoFactor } from "../models/request/identityToken/tokenRequestTwoFactor";
import { PreloginRequest } from "../models/request/preloginRequest";
import { ErrorResponse } from "../models/response/errorResponse";

const sessionTimeoutLength = 2 * 60 * 1000; // 2 minutes

export class AuthService implements AuthServiceAbstraction {
  get email(): string {
    return this.logInStrategy instanceof PasswordLogInStrategy ? this.logInStrategy.email : null;
  }

  get masterPasswordHash(): string {
    return this.logInStrategy instanceof PasswordLogInStrategy
      ? this.logInStrategy.masterPasswordHash
      : null;
  }

  private logInStrategy: ApiLogInStrategy | PasswordLogInStrategy | SsoLogInStrategy;
  private sessionTimeout: any;

  constructor(
    protected cryptoService: CryptoService,
    protected apiService: ApiService,
    protected tokenService: TokenService,
    protected appIdService: AppIdService,
    protected platformUtilsService: PlatformUtilsService,
    protected messagingService: MessagingService,
    protected logService: LogService,
    protected keyConnectorService: KeyConnectorService,
    protected environmentService: EnvironmentService,
    protected stateService: StateService,
    protected twoFactorService: TwoFactorService,
    protected i18nService: I18nService,
  ) {}

  async logIn(
    credentials: ApiLogInCredentials | PasswordLogInCredentials | SsoLogInCredentials,
  ): Promise<AuthResult> {
    this.clearState();

    let strategy: ApiLogInStrategy | PasswordLogInStrategy | SsoLogInStrategy;

    if (credentials.type === AuthenticationType.Password) {
      strategy = new PasswordLogInStrategy(
        this.cryptoService,
        this.apiService,
        this.tokenService,
        this.appIdService,
        this.platformUtilsService,
        this.messagingService,
        this.logService,
        this.stateService,
        this.twoFactorService,
        this,
      );
    } else if (credentials.type === AuthenticationType.Sso) {
      strategy = new SsoLogInStrategy(
        this.cryptoService,
        this.apiService,
        this.tokenService,
        this.appIdService,
        this.platformUtilsService,
        this.messagingService,
        this.logService,
        this.stateService,
        this.twoFactorService,
        this.keyConnectorService,
      );
    } else if (credentials.type === AuthenticationType.Api) {
      strategy = new ApiLogInStrategy(
        this.cryptoService,
        this.apiService,
        this.tokenService,
        this.appIdService,
        this.platformUtilsService,
        this.messagingService,
        this.logService,
        this.stateService,
        this.twoFactorService,
        this.environmentService,
        this.keyConnectorService,
      );
    }

    const result = await strategy.logIn(credentials as any);

    if (result?.requiresTwoFactor) {
      this.saveState(strategy);
    }
    return result;
  }

  async logInTwoFactor(
    twoFactor: TokenRequestTwoFactor,
    captchaResponse: string,
  ): Promise<AuthResult> {
    if (this.logInStrategy == null) {
      throw new Error(this.i18nService.t("sessionTimeout"));
    }

    try {
      const result = await this.logInStrategy.logInTwoFactor(twoFactor, captchaResponse);

      // Only clear state if 2FA token has been accepted, otherwise we need to be able to try again
      if (!result.requiresTwoFactor && !result.requiresCaptcha) {
        this.clearState();
      }
      return result;
    } catch (e) {
      // API exceptions are okay, but if there are any unhandled client-side errors then clear state to be safe
      if (!(e instanceof ErrorResponse)) {
        this.clearState();
      }
      throw e;
    }
  }

  logOut(callback: () => void) {
    callback();
    this.messagingService.send("loggedOut");
  }

  authingWithApiKey(): boolean {
    return this.logInStrategy instanceof ApiLogInStrategy;
  }

  authingWithSso(): boolean {
    return this.logInStrategy instanceof SsoLogInStrategy;
  }

  authingWithPassword(): boolean {
    return this.logInStrategy instanceof PasswordLogInStrategy;
  }

  async makePreloginKey(masterPassword: string, email: string): Promise<SymmetricCryptoKey> {
    email = email.trim().toLowerCase();
    let kdf: KdfType = null;
    let kdfIterations: number = null;
    try {
      const preloginResponse = await this.apiService.postPrelogin(new PreloginRequest(email));
      if (preloginResponse != null) {
        kdf = preloginResponse.kdf;
        kdfIterations = preloginResponse.kdfIterations;
      }
    } catch (e) {
      if (e == null || e.statusCode !== 404) {
        throw e;
      }
    }
    return this.cryptoService.makeKey(masterPassword, email, kdf, kdfIterations);
  }

  private saveState(strategy: ApiLogInStrategy | PasswordLogInStrategy | SsoLogInStrategy) {
    this.logInStrategy = strategy;
    this.startSessionTimeout();
  }

  private clearState() {
    this.logInStrategy = null;
    this.clearSessionTimeout();
  }

  private startSessionTimeout() {
    this.clearSessionTimeout();
    this.sessionTimeout = setTimeout(() => this.clearState(), sessionTimeoutLength);
  }

  private clearSessionTimeout() {
    if (this.sessionTimeout != null) {
      clearTimeout(this.sessionTimeout);
    }
  }
}
