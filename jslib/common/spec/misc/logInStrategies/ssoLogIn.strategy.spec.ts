import { Arg, Substitute, SubstituteOf } from "@fluffy-spoon/substitute";

import { ApiService } from "jslib-common/abstractions/api.service";
import { AppIdService } from "jslib-common/abstractions/appId.service";
import { CryptoService } from "jslib-common/abstractions/crypto.service";
import { KeyConnectorService } from "jslib-common/abstractions/keyConnector.service";
import { LogService } from "jslib-common/abstractions/log.service";
import { MessagingService } from "jslib-common/abstractions/messaging.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { StateService } from "jslib-common/abstractions/state.service";
import { TokenService } from "jslib-common/abstractions/token.service";
import { TwoFactorService } from "jslib-common/abstractions/twoFactor.service";
import { SsoLogInStrategy } from "jslib-common/misc/logInStrategies/ssoLogin.strategy";
import { Utils } from "jslib-common/misc/utils";
import { SsoLogInCredentials } from "jslib-common/models/domain/logInCredentials";

import { identityTokenResponseFactory } from "./logIn.strategy.spec";

describe("SsoLogInStrategy", () => {
  let cryptoService: SubstituteOf<CryptoService>;
  let apiService: SubstituteOf<ApiService>;
  let tokenService: SubstituteOf<TokenService>;
  let appIdService: SubstituteOf<AppIdService>;
  let platformUtilsService: SubstituteOf<PlatformUtilsService>;
  let messagingService: SubstituteOf<MessagingService>;
  let logService: SubstituteOf<LogService>;
  let keyConnectorService: SubstituteOf<KeyConnectorService>;
  let stateService: SubstituteOf<StateService>;
  let twoFactorService: SubstituteOf<TwoFactorService>;

  let ssoLogInStrategy: SsoLogInStrategy;
  let credentials: SsoLogInCredentials;

  const deviceId = Utils.newGuid();
  const encKey = "ENC_KEY";
  const privateKey = "PRIVATE_KEY";
  const keyConnectorUrl = "KEY_CONNECTOR_URL";

  const ssoCode = "SSO_CODE";
  const ssoCodeVerifier = "SSO_CODE_VERIFIER";
  const ssoRedirectUrl = "SSO_REDIRECT_URL";
  const ssoOrgId = "SSO_ORG_ID";

  beforeEach(async () => {
    cryptoService = Substitute.for<CryptoService>();
    apiService = Substitute.for<ApiService>();
    tokenService = Substitute.for<TokenService>();
    appIdService = Substitute.for<AppIdService>();
    platformUtilsService = Substitute.for<PlatformUtilsService>();
    messagingService = Substitute.for<MessagingService>();
    logService = Substitute.for<LogService>();
    stateService = Substitute.for<StateService>();
    keyConnectorService = Substitute.for<KeyConnectorService>();
    twoFactorService = Substitute.for<TwoFactorService>();

    tokenService.getTwoFactorToken().resolves(null);
    appIdService.getAppId().resolves(deviceId);

    ssoLogInStrategy = new SsoLogInStrategy(
      cryptoService,
      apiService,
      tokenService,
      appIdService,
      platformUtilsService,
      messagingService,
      logService,
      stateService,
      twoFactorService,
      keyConnectorService
    );
    credentials = new SsoLogInCredentials(ssoCode, ssoCodeVerifier, ssoRedirectUrl, ssoOrgId);
  });

  it("sends SSO information to server", async () => {
    apiService.postIdentityToken(Arg.any()).resolves(identityTokenResponseFactory());

    await ssoLogInStrategy.logIn(credentials);

    apiService.received(1).postIdentityToken(
      Arg.is((actual) => {
        const ssoTokenRequest = actual as any;
        return (
          ssoTokenRequest.code === ssoCode &&
          ssoTokenRequest.codeVerifier === ssoCodeVerifier &&
          ssoTokenRequest.redirectUri === ssoRedirectUrl &&
          ssoTokenRequest.device.identifier === deviceId &&
          ssoTokenRequest.twoFactor.provider == null &&
          ssoTokenRequest.twoFactor.token == null
        );
      })
    );
  });

  it("does not set keys for new SSO user flow", async () => {
    const tokenResponse = identityTokenResponseFactory();
    tokenResponse.key = null;
    apiService.postIdentityToken(Arg.any()).resolves(tokenResponse);

    await ssoLogInStrategy.logIn(credentials);

    cryptoService.didNotReceive().setEncPrivateKey(privateKey);
    cryptoService.didNotReceive().setEncKey(encKey);
  });

  it("gets and sets KeyConnector key for enrolled user", async () => {
    const tokenResponse = identityTokenResponseFactory();
    tokenResponse.keyConnectorUrl = keyConnectorUrl;

    apiService.postIdentityToken(Arg.any()).resolves(tokenResponse);

    await ssoLogInStrategy.logIn(credentials);

    keyConnectorService.received(1).getAndSetKey(keyConnectorUrl);
  });

  it("converts new SSO user to Key Connector on first login", async () => {
    const tokenResponse = identityTokenResponseFactory();
    tokenResponse.keyConnectorUrl = keyConnectorUrl;
    tokenResponse.key = null;

    apiService.postIdentityToken(Arg.any()).resolves(tokenResponse);

    await ssoLogInStrategy.logIn(credentials);

    keyConnectorService.received(1).convertNewSsoUserToKeyConnector(tokenResponse, ssoOrgId);
  });
});
