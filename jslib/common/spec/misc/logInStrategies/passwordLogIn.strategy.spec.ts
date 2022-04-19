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
import { HashPurpose } from "jslib-common/enums/hashPurpose";
import { PasswordLogInStrategy } from "jslib-common/misc/logInStrategies/passwordLogin.strategy";
import { Utils } from "jslib-common/misc/utils";
import { PasswordLogInCredentials } from "jslib-common/models/domain/logInCredentials";
import { SymmetricCryptoKey } from "jslib-common/models/domain/symmetricCryptoKey";

import { identityTokenResponseFactory } from "./logIn.strategy.spec";

const email = "hello@world.com";
const masterPassword = "password";
const hashedPassword = "HASHED_PASSWORD";
const localHashedPassword = "LOCAL_HASHED_PASSWORD";
const preloginKey = new SymmetricCryptoKey(
  Utils.fromB64ToArray(
    "N2KWjlLpfi5uHjv+YcfUKIpZ1l+W+6HRensmIqD+BFYBf6N/dvFpJfWwYnVBdgFCK2tJTAIMLhqzIQQEUmGFgg=="
  )
);
const deviceId = Utils.newGuid();

describe("PasswordLogInStrategy", () => {
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
    tokenService.getTwoFactorToken().resolves(null);

    authService.makePreloginKey(Arg.any(), Arg.any()).resolves(preloginKey);

    cryptoService.hashPassword(masterPassword, Arg.any()).resolves(hashedPassword);
    cryptoService
      .hashPassword(masterPassword, Arg.any(), HashPurpose.LocalAuthorization)
      .resolves(localHashedPassword);

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

    apiService.postIdentityToken(Arg.any()).resolves(identityTokenResponseFactory());
  });

  it("sends master password credentials to the server", async () => {
    await passwordLogInStrategy.logIn(credentials);

    apiService.received(1).postIdentityToken(
      Arg.is((actual) => {
        const passwordTokenRequest = actual as any; // Need to access private fields
        return (
          passwordTokenRequest.email === email &&
          passwordTokenRequest.masterPasswordHash === hashedPassword &&
          passwordTokenRequest.device.identifier === deviceId &&
          passwordTokenRequest.twoFactor.provider == null &&
          passwordTokenRequest.twoFactor.token == null &&
          passwordTokenRequest.captchaResponse == null
        );
      })
    );
  });

  it("sets the local environment after a successful login", async () => {
    await passwordLogInStrategy.logIn(credentials);

    cryptoService.received(1).setKey(preloginKey);
    cryptoService.received(1).setKeyHash(localHashedPassword);
  });
});
