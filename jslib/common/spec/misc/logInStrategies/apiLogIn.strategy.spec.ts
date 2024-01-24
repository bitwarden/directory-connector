import { Arg, Substitute, SubstituteOf } from "@fluffy-spoon/substitute";

import { ApiService } from "@/jslib/common/src/abstractions/api.service";
import { AppIdService } from "@/jslib/common/src/abstractions/appId.service";
import { CryptoService } from "@/jslib/common/src/abstractions/crypto.service";
import { EnvironmentService } from "@/jslib/common/src/abstractions/environment.service";
import { KeyConnectorService } from "@/jslib/common/src/abstractions/keyConnector.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { PlatformUtilsService } from "@/jslib/common/src/abstractions/platformUtils.service";
import { StateService } from "@/jslib/common/src/abstractions/state.service";
import { TokenService } from "@/jslib/common/src/abstractions/token.service";
import { TwoFactorService } from "@/jslib/common/src/abstractions/twoFactor.service";
import { ApiLogInStrategy } from "@/jslib/common/src/misc/logInStrategies/apiLogin.strategy";
import { Utils } from "@/jslib/common/src/misc/utils";
import { ApiLogInCredentials } from "@/jslib/common/src/models/domain/logInCredentials";

import { identityTokenResponseFactory } from "./logIn.strategy.spec";

describe("ApiLogInStrategy", () => {
  let cryptoService: SubstituteOf<CryptoService>;
  let apiService: SubstituteOf<ApiService>;
  let tokenService: SubstituteOf<TokenService>;
  let appIdService: SubstituteOf<AppIdService>;
  let platformUtilsService: SubstituteOf<PlatformUtilsService>;
  let messagingService: SubstituteOf<MessagingService>;
  let logService: SubstituteOf<LogService>;
  let environmentService: SubstituteOf<EnvironmentService>;
  let keyConnectorService: SubstituteOf<KeyConnectorService>;
  let stateService: SubstituteOf<StateService>;
  let twoFactorService: SubstituteOf<TwoFactorService>;

  let apiLogInStrategy: ApiLogInStrategy;
  let credentials: ApiLogInCredentials;

  const deviceId = Utils.newGuid();
  const keyConnectorUrl = "KEY_CONNECTOR_URL";
  const apiClientId = "API_CLIENT_ID";
  const apiClientSecret = "API_CLIENT_SECRET";

  beforeEach(async () => {
    cryptoService = Substitute.for<CryptoService>();
    apiService = Substitute.for<ApiService>();
    tokenService = Substitute.for<TokenService>();
    appIdService = Substitute.for<AppIdService>();
    platformUtilsService = Substitute.for<PlatformUtilsService>();
    messagingService = Substitute.for<MessagingService>();
    logService = Substitute.for<LogService>();
    environmentService = Substitute.for<EnvironmentService>();
    stateService = Substitute.for<StateService>();
    keyConnectorService = Substitute.for<KeyConnectorService>();
    twoFactorService = Substitute.for<TwoFactorService>();

    appIdService.getAppId().resolves(deviceId);
    tokenService.getTwoFactorToken().resolves(null);

    apiLogInStrategy = new ApiLogInStrategy(
      cryptoService,
      apiService,
      tokenService,
      appIdService,
      platformUtilsService,
      messagingService,
      logService,
      stateService,
      twoFactorService,
      environmentService,
      keyConnectorService,
    );

    credentials = new ApiLogInCredentials(apiClientId, apiClientSecret);
  });

  it("sends api key credentials to the server", async () => {
    apiService.postIdentityToken(Arg.any()).resolves(identityTokenResponseFactory());
    await apiLogInStrategy.logIn(credentials);

    apiService.received(1).postIdentityToken(
      Arg.is((actual) => {
        const apiTokenRequest = actual as any;
        return (
          apiTokenRequest.clientId === apiClientId &&
          apiTokenRequest.clientSecret === apiClientSecret &&
          apiTokenRequest.device.identifier === deviceId &&
          apiTokenRequest.twoFactor.provider == null &&
          apiTokenRequest.twoFactor.token == null &&
          apiTokenRequest.captchaResponse == null
        );
      }),
    );
  });

  it("sets the local environment after a successful login", async () => {
    apiService.postIdentityToken(Arg.any()).resolves(identityTokenResponseFactory());

    await apiLogInStrategy.logIn(credentials);

    stateService.received(1).setApiKeyClientId(apiClientId);
    stateService.received(1).setApiKeyClientSecret(apiClientSecret);
    stateService.received(1).addAccount(Arg.any());
  });

  it("gets and sets the Key Connector key from environmentUrl", async () => {
    const tokenResponse = identityTokenResponseFactory();
    tokenResponse.apiUseKeyConnector = true;

    apiService.postIdentityToken(Arg.any()).resolves(tokenResponse);
    environmentService.getKeyConnectorUrl().returns(keyConnectorUrl);

    await apiLogInStrategy.logIn(credentials);

    keyConnectorService.received(1).getAndSetKey(keyConnectorUrl);
  });
});
