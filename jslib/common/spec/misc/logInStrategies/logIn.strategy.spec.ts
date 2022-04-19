import { Arg, Substitute, SubstituteOf } from "@fluffy-spoon/substitute";

import { ApiService } from "jslib-common/abstractions/api.service";
import { AppIdService } from "jslib-common/abstractions/appId.service";
import { AuthService } from "jslib-common/abstractions/auth.service";
import { CryptoService } from "jslib-common/abstractions/crypto.service";
import { LogService } from "jslib-common/abstractions/log.service";
import { MessagingService } from "jslib-common/abstractions/messaging.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { StateService } from "jslib-common/abstractions/state.service";
import { TokenService } from "jslib-common/abstractions/token.service";
import { TwoFactorService } from "jslib-common/abstractions/twoFactor.service";
import { TwoFactorProviderType } from "jslib-common/enums/twoFactorProviderType";
import { PasswordLogInStrategy } from "jslib-common/misc/logInStrategies/passwordLogin.strategy";
import { Utils } from "jslib-common/misc/utils";
import { Account, AccountProfile, AccountTokens } from "jslib-common/models/domain/account";
import { AuthResult } from "jslib-common/models/domain/authResult";
import { EncString } from "jslib-common/models/domain/encString";
import { PasswordLogInCredentials } from "jslib-common/models/domain/logInCredentials";
import { PasswordTokenRequest } from "jslib-common/models/request/identityToken/passwordTokenRequest";
import { TokenRequestTwoFactor } from "jslib-common/models/request/identityToken/tokenRequestTwoFactor";
import { IdentityCaptchaResponse } from "jslib-common/models/response/identityCaptchaResponse";
import { IdentityTokenResponse } from "jslib-common/models/response/identityTokenResponse";
import { IdentityTwoFactorResponse } from "jslib-common/models/response/identityTwoFactorResponse";

const email = "hello@world.com";
const masterPassword = "password";

const deviceId = Utils.newGuid();
const accessToken = "ACCESS_TOKEN";
const refreshToken = "REFRESH_TOKEN";
const encKey = "ENC_KEY";
const privateKey = "PRIVATE_KEY";
const captchaSiteKey = "CAPTCHA_SITE_KEY";
const kdf = 0;
const kdfIterations = 10000;
const userId = Utils.newGuid();
const masterPasswordHash = "MASTER_PASSWORD_HASH";

const decodedToken = {
  sub: userId,
  email: email,
  premium: false,
};

const twoFactorProviderType = TwoFactorProviderType.Authenticator;
const twoFactorToken = "TWO_FACTOR_TOKEN";
const twoFactorRemember = true;

export function identityTokenResponseFactory() {
  return new IdentityTokenResponse({
    ForcePasswordReset: false,
    Kdf: kdf,
    KdfIterations: kdfIterations,
    Key: encKey,
    PrivateKey: privateKey,
    ResetMasterPassword: false,
    access_token: accessToken,
    expires_in: 3600,
    refresh_token: refreshToken,
    scope: "api offline_access",
    token_type: "Bearer",
  });
}

describe("LogInStrategy", () => {
  let cryptoService: SubstituteOf<CryptoService>;
  let apiService: SubstituteOf<ApiService>;
  let tokenService: SubstituteOf<TokenService>;
  let appIdService: SubstituteOf<AppIdService>;
  let platformUtilsService: SubstituteOf<PlatformUtilsService>;
  let messagingService: SubstituteOf<MessagingService>;
  let logService: SubstituteOf<LogService>;
  let stateService: SubstituteOf<StateService>;
  let twoFactorService: SubstituteOf<TwoFactorService>;
  let authService: SubstituteOf<AuthService>;

  let passwordLogInStrategy: PasswordLogInStrategy;
  let credentials: PasswordLogInCredentials;

  beforeEach(async () => {
    cryptoService = Substitute.for<CryptoService>();
    apiService = Substitute.for<ApiService>();
    tokenService = Substitute.for<TokenService>();
    appIdService = Substitute.for<AppIdService>();
    platformUtilsService = Substitute.for<PlatformUtilsService>();
    messagingService = Substitute.for<MessagingService>();
    logService = Substitute.for<LogService>();
    stateService = Substitute.for<StateService>();
    twoFactorService = Substitute.for<TwoFactorService>();
    authService = Substitute.for<AuthService>();

    appIdService.getAppId().resolves(deviceId);

    // The base class is abstract so we test it via PasswordLogInStrategy
    passwordLogInStrategy = new PasswordLogInStrategy(
      cryptoService,
      apiService,
      tokenService,
      appIdService,
      platformUtilsService,
      messagingService,
      logService,
      stateService,
      twoFactorService,
      authService
    );
    credentials = new PasswordLogInCredentials(email, masterPassword);
  });

  describe("base class", () => {
    it("sets the local environment after a successful login", async () => {
      apiService.postIdentityToken(Arg.any()).resolves(identityTokenResponseFactory());
      tokenService.decodeToken(accessToken).resolves(decodedToken);

      await passwordLogInStrategy.logIn(credentials);

      stateService.received(1).addAccount(
        new Account({
          profile: {
            ...new AccountProfile(),
            ...{
              userId: userId,
              email: email,
              hasPremiumPersonally: false,
              kdfIterations: kdfIterations,
              kdfType: kdf,
            },
          },
          tokens: {
            ...new AccountTokens(),
            ...{
              accessToken: accessToken,
              refreshToken: refreshToken,
            },
          },
        })
      );
      cryptoService.received(1).setEncKey(encKey);
      cryptoService.received(1).setEncPrivateKey(privateKey);

      stateService.received(1).setBiometricLocked(false);
      messagingService.received(1).send("loggedIn");
    });

    it("builds AuthResult", async () => {
      const tokenResponse = identityTokenResponseFactory();
      tokenResponse.forcePasswordReset = true;
      tokenResponse.resetMasterPassword = true;

      apiService.postIdentityToken(Arg.any()).resolves(tokenResponse);

      const result = await passwordLogInStrategy.logIn(credentials);

      const expected = new AuthResult();
      expected.forcePasswordReset = true;
      expected.resetMasterPassword = true;
      expected.twoFactorProviders = null;
      expected.captchaSiteKey = "";
      expect(result).toEqual(expected);
    });

    it("rejects login if CAPTCHA is required", async () => {
      // Sample CAPTCHA response
      const tokenResponse = new IdentityCaptchaResponse({
        error: "invalid_grant",
        error_description: "Captcha required.",
        HCaptcha_SiteKey: captchaSiteKey,
      });

      apiService.postIdentityToken(Arg.any()).resolves(tokenResponse);

      const result = await passwordLogInStrategy.logIn(credentials);

      stateService.didNotReceive().addAccount(Arg.any());
      messagingService.didNotReceive().send(Arg.any());

      const expected = new AuthResult();
      expected.captchaSiteKey = captchaSiteKey;
      expect(result).toEqual(expected);
    });

    it("makes a new public and private key for an old account", async () => {
      const tokenResponse = identityTokenResponseFactory();
      tokenResponse.privateKey = null;
      cryptoService.makeKeyPair(Arg.any()).resolves(["PUBLIC_KEY", new EncString("PRIVATE_KEY")]);

      apiService.postIdentityToken(Arg.any()).resolves(tokenResponse);

      await passwordLogInStrategy.logIn(credentials);

      apiService.received(1).postAccountKeys(Arg.any());
    });
  });

  describe("Two-factor authentication", () => {
    it("rejects login if 2FA is required", async () => {
      // Sample response where TOTP 2FA required
      const tokenResponse = new IdentityTwoFactorResponse({
        TwoFactorProviders: ["0"],
        TwoFactorProviders2: { 0: null },
        error: "invalid_grant",
        error_description: "Two factor required.",
      });

      apiService.postIdentityToken(Arg.any()).resolves(tokenResponse);

      const result = await passwordLogInStrategy.logIn(credentials);

      stateService.didNotReceive().addAccount(Arg.any());
      messagingService.didNotReceive().send(Arg.any());

      const expected = new AuthResult();
      expected.twoFactorProviders = new Map<TwoFactorProviderType, { [key: string]: string }>();
      expected.twoFactorProviders.set(0, null);
      expect(result).toEqual(expected);
    });

    it("sends stored 2FA token to server", async () => {
      tokenService.getTwoFactorToken().resolves(twoFactorToken);
      apiService.postIdentityToken(Arg.any()).resolves(identityTokenResponseFactory());

      await passwordLogInStrategy.logIn(credentials);

      apiService.received(1).postIdentityToken(
        Arg.is((actual) => {
          const passwordTokenRequest = actual as any;
          return (
            passwordTokenRequest.twoFactor.provider === TwoFactorProviderType.Remember &&
            passwordTokenRequest.twoFactor.token === twoFactorToken &&
            passwordTokenRequest.twoFactor.remember === false
          );
        })
      );
    });

    it("sends 2FA token provided by user to server (single step)", async () => {
      // This occurs if the user enters the 2FA code as an argument in the CLI
      apiService.postIdentityToken(Arg.any()).resolves(identityTokenResponseFactory());
      credentials.twoFactor = new TokenRequestTwoFactor(
        twoFactorProviderType,
        twoFactorToken,
        twoFactorRemember
      );

      await passwordLogInStrategy.logIn(credentials);

      apiService.received(1).postIdentityToken(
        Arg.is((actual) => {
          const passwordTokenRequest = actual as any;
          return (
            passwordTokenRequest.twoFactor.provider === twoFactorProviderType &&
            passwordTokenRequest.twoFactor.token === twoFactorToken &&
            passwordTokenRequest.twoFactor.remember === twoFactorRemember
          );
        })
      );
    });

    it("sends 2FA token provided by user to server (two-step)", async () => {
      // Simulate a partially completed login
      passwordLogInStrategy.tokenRequest = new PasswordTokenRequest(
        email,
        masterPasswordHash,
        null,
        null
      );

      apiService.postIdentityToken(Arg.any()).resolves(identityTokenResponseFactory());

      await passwordLogInStrategy.logInTwoFactor(
        new TokenRequestTwoFactor(twoFactorProviderType, twoFactorToken, twoFactorRemember),
        null
      );

      apiService.received(1).postIdentityToken(
        Arg.is((actual) => {
          const passwordTokenRequest = actual as any;
          return (
            passwordTokenRequest.twoFactor.provider === twoFactorProviderType &&
            passwordTokenRequest.twoFactor.token === twoFactorToken &&
            passwordTokenRequest.twoFactor.remember === twoFactorRemember
          );
        })
      );
    });
  });
});
