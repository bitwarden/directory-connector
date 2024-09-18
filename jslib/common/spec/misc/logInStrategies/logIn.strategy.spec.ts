import { Arg, Substitute, SubstituteOf } from "@fluffy-spoon/substitute";

import { ApiService } from "@/jslib/common/src/abstractions/api.service";
import { AppIdService } from "@/jslib/common/src/abstractions/appId.service";
import { PlatformUtilsService } from "@/jslib/common/src/abstractions/platformUtils.service";
import { StateService } from "@/jslib/common/src/abstractions/state.service";
import { Utils } from "@/jslib/common/src/misc/utils";
import {
  AccountKeys,
  AccountProfile,
  AccountTokens,
} from "@/jslib/common/src/models/domain/account";
import {
  ApiLogInCredentials,
} from "@/jslib/common/src/models/domain/logInCredentials";
import { IdentityTokenResponse } from "@/jslib/common/src/models/response/identityTokenResponse";

import { Account, DirectoryConfigurations, DirectorySettings } from '../../../../../src/models/account';
import { LogInStrategy } from "../../../src/misc/logInStrategies/logIn.strategy";

const clientId = "organization.CLIENT_ID";
const clientSecret = "CLIENT_SECRET";

const deviceId = Utils.newGuid();
const accessToken = "ACCESS_TOKEN";
const refreshToken = "REFRESH_TOKEN";

export function identityTokenResponseFactory() {
  return new IdentityTokenResponse({
    access_token: accessToken,
    refresh_token: refreshToken, // not actually sure this is sent but including it out of caution
    expires_in: 3600,
    token_type: "Bearer",
    scope: "api.organization",
  });
}

describe("LogInStrategy", () => {
  let apiService: SubstituteOf<ApiService>;
  let appIdService: SubstituteOf<AppIdService>;
  let platformUtilsService: SubstituteOf<PlatformUtilsService>;
  let stateService: SubstituteOf<StateService>;

  let loginStrategy: LogInStrategy;
  let credentials: ApiLogInCredentials;

  beforeEach(async () => {
    apiService = Substitute.for<ApiService>();
    appIdService = Substitute.for<AppIdService>();
    platformUtilsService = Substitute.for<PlatformUtilsService>();
    stateService = Substitute.for<StateService>();

    appIdService.getAppId().resolves(deviceId);

    // The base class is abstract so we test it via PasswordLogInStrategy
    loginStrategy = new LogInStrategy(
      apiService,
      appIdService,
      platformUtilsService,
      stateService,
    );
    credentials = new ApiLogInCredentials(clientId, clientSecret);
  });

  describe("base class", () => {
    it("sets the local environment after a successful login", async () => {
      apiService.postIdentityToken(Arg.any()).resolves(identityTokenResponseFactory());

      await loginStrategy.logIn(credentials);

      stateService.received(1).addAccount(
        new Account({
          profile: {
            ...new AccountProfile(),
            ...{
              userId: "CLIENT_ID",
              apiKeyClientId: clientId, // with the "organization." prefix
              entityId: "CLIENT_ID",
            },
          },
          tokens: {
            ...new AccountTokens(),
            ...{
              accessToken: accessToken,
              refreshToken: refreshToken,
            },
          },
          keys: {
            ...new AccountKeys(),
            ...{
              apiKeyClientSecret: clientSecret,
            },
          },
          directorySettings: new DirectorySettings(),
          directoryConfigurations: new DirectoryConfigurations()
        }),
      );
    });
  });
});
