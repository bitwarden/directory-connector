import { ApiService } from "@/jslib/common/src/abstractions/api.service";
import { AppIdService } from "@/jslib/common/src/abstractions/appId.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { PlatformUtilsService } from "@/jslib/common/src/abstractions/platformUtils.service";
import { DeviceRequest } from "@/jslib/common/src/models/request/deviceRequest";
import { ApiTokenRequest } from "@/jslib/common/src/models/request/identityToken/apiTokenRequest";
import { TokenRequestTwoFactor } from "@/jslib/common/src/models/request/identityToken/tokenRequestTwoFactor";
import { IdentityTokenResponse } from "@/jslib/common/src/models/response/identityTokenResponse";

import { StateServiceVNext } from "../abstractions/state-vNext.service";

export class AuthService {
  constructor(
    private apiService: ApiService,
    private appIdService: AppIdService,
    private platformUtilsService: PlatformUtilsService,
    private messagingService: MessagingService,
    private stateService: StateServiceVNext,
  ) {}

  async logIn(credentials: { clientId: string; clientSecret: string }) {
    const tokenRequest = new ApiTokenRequest(
      credentials.clientId,
      credentials.clientSecret,
      new TokenRequestTwoFactor(), // unused
      await this.buildDeviceRequest(),
    );

    const response = await this.apiService.postIdentityToken(tokenRequest);

    if (response instanceof IdentityTokenResponse) {
      await this.saveAccountInformation(tokenRequest, response);
      return;
    }

    throw new Error("Invalid response object.");
  }

  logOut(callback: () => void) {
    callback();
    this.messagingService.send("loggedOut");
  }

  private async buildDeviceRequest() {
    const appId = await this.appIdService.getAppId();
    return new DeviceRequest(appId, this.platformUtilsService);
  }

  private async saveAccountInformation(
    tokenRequest: ApiTokenRequest,
    tokenResponse: IdentityTokenResponse,
  ) {
    const clientId = tokenRequest.clientId;
    const entityId = clientId.split("organization.")[1];

    // DC is single-organization, so we only need to set the organization ID
    // TokenService handles token storage via its own StateService instance
    await this.stateService.setOrganizationId(entityId);
  }
}
