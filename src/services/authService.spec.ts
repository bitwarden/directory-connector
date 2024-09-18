import { Arg, Substitute, SubstituteOf } from "@fluffy-spoon/substitute";

import { ApiService } from "@/jslib/common/src/abstractions/api.service";
import { AppIdService } from "@/jslib/common/src/abstractions/appId.service";
import { PlatformUtilsService } from "@/jslib/common/src/abstractions/platformUtils.service";
import { Utils } from "@/jslib/common/src/misc/utils";
import {
  AccountKeys,
  AccountProfile,
  AccountTokens,
} from "@/jslib/common/src/models/domain/account";
import { ApiLogInCredentials } from "@/jslib/common/src/models/domain/logInCredentials";
import { IdentityTokenResponse } from "@/jslib/common/src/models/response/identityTokenResponse";

import { MessagingService } from "../../jslib/common/src/abstractions/messaging.service";
import { Account, DirectoryConfigurations, DirectorySettings } from "../models/account";

import { AuthService } from "./auth.service";
import { StateService } from "./state.service";

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

describe("AuthService", () => {
  let apiService: SubstituteOf<ApiService>;
  let appIdService: SubstituteOf<AppIdService>;
  let platformUtilsService: SubstituteOf<PlatformUtilsService>;
  let messagingService: SubstituteOf<MessagingService>;
  let stateService: SubstituteOf<StateService>;

  let authService: AuthService;
  let credentials: ApiLogInCredentials;

  beforeEach(async () => {
    apiService = Substitute.for();
    appIdService = Substitute.for();
    platformUtilsService = Substitute.for();
    stateService = Substitute.for();
    messagingService = Substitute.for();

    appIdService.getAppId().resolves(deviceId);

    authService = new AuthService(
      apiService,
      appIdService,
      platformUtilsService,
      messagingService,
      stateService,
    );
    credentials = new ApiLogInCredentials(clientId, clientSecret);
  });

  it("sets the local environment after a successful login", async () => {
    apiService.postIdentityToken(Arg.any()).resolves(identityTokenResponseFactory());

    await authService.logIn(credentials);

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
        directoryConfigurations: new DirectoryConfigurations(),
      }),
    );
  });
});
