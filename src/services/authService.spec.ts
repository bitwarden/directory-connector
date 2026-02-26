import { mock } from "jest-mock-extended";

import { ApiService } from "@/jslib/common/src/abstractions/api.service";
import { AppIdService } from "@/jslib/common/src/abstractions/appId.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { PlatformUtilsService } from "@/jslib/common/src/abstractions/platformUtils.service";
import { Utils } from "@/jslib/common/src/misc/utils";
import { IdentityTokenResponse } from "@/jslib/common/src/models/response/identityTokenResponse";

import { StateService } from "../abstractions/state.service";

import { AuthService } from "./auth.service";

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
  let apiService: jest.Mocked<ApiService>;
  let appIdService: jest.Mocked<AppIdService>;
  let platformUtilsService: jest.Mocked<PlatformUtilsService>;
  let messagingService: jest.Mocked<MessagingService>;
  let stateService: jest.Mocked<StateService>;

  let authService: AuthService;

  beforeEach(async () => {
    apiService = mock<ApiService>();
    appIdService = mock<AppIdService>();
    platformUtilsService = mock<PlatformUtilsService>();
    stateService = mock<StateService>();
    messagingService = mock<MessagingService>();

    appIdService.getAppId.mockResolvedValue(deviceId);

    authService = new AuthService(
      apiService,
      appIdService,
      platformUtilsService,
      messagingService,
      stateService,
    );
  });

  it("sets the organization ID after a successful login", async () => {
    apiService.postIdentityToken.mockResolvedValue(identityTokenResponseFactory());

    await authService.logIn({ clientId, clientSecret });

    // Verify authentication tokens are saved
    expect(stateService.setAccessToken).toHaveBeenCalledWith(accessToken);
    expect(stateService.setRefreshToken).toHaveBeenCalledWith(refreshToken);

    // Verify API key credentials are saved
    expect(stateService.setApiKeyClientId).toHaveBeenCalledWith(clientId);
    expect(stateService.setApiKeyClientSecret).toHaveBeenCalledWith(clientSecret);

    // Verify entity ID and organization ID are saved
    expect(stateService.setEntityId).toHaveBeenCalledWith("CLIENT_ID");
    expect(stateService.setOrganizationId).toHaveBeenCalledWith("CLIENT_ID");
  });
});
