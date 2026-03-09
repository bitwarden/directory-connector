import { ApiService } from "@/libs/abstractions/api.service";
import { AppIdService } from "@/libs/abstractions/appId.service";
import { MessagingService } from "@/libs/abstractions/messaging.service";
import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { StateService } from "@/libs/abstractions/state.service";
import { DeviceRequest } from "@/libs/models/request/deviceRequest";
import { ApiTokenRequest } from "@/libs/models/request/identityToken/apiTokenRequest";
import { TokenRequestTwoFactor } from "@/libs/models/request/identityToken/tokenRequestTwoFactor";
import { IdentityTokenResponse } from "@/libs/models/response/identityTokenResponse";

export class AuthService {
  constructor(
    private apiService: ApiService,
    private appIdService: AppIdService,
    private platformUtilsService: PlatformUtilsService,
    private messagingService: MessagingService,
    private stateService: StateService,
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
    const clientSecret = tokenRequest.clientSecret;

    await this.stateService.setAccessToken(tokenResponse.accessToken);
    await this.stateService.setRefreshToken(tokenResponse.refreshToken);
    await this.stateService.setApiKeyClientId(clientId);
    await this.stateService.setApiKeyClientSecret(clientSecret);
    await this.stateService.setEntityId(entityId);
    await this.stateService.setOrganizationId(entityId);
  }
}
