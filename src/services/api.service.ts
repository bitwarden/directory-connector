import { AuthService } from "jslib-common/abstractions/auth.service";
import { EnvironmentService } from "jslib-common/abstractions/environment.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { TokenService } from "jslib-common/abstractions/token.service";
import { ApiLogInCredentials } from "jslib-common/models/domain/logInCredentials";
import { ApiService as ApiServiceBase } from "jslib-common/services/api.service";

import { StateService } from "../abstractions/state.service";

export async function refreshToken(stateService: StateService, authService: AuthService) {
  try {
    const clientId = await stateService.getApiKeyClientId();
    const clientSecret = await stateService.getApiKeyClientSecret();
    if (clientId != null && clientSecret != null) {
      await authService.logIn(new ApiLogInCredentials(clientId, clientSecret));
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

export class ApiService extends ApiServiceBase {
  constructor(
    tokenService: TokenService,
    platformUtilsService: PlatformUtilsService,
    environmentService: EnvironmentService,
    private refreshTokenCallback: () => Promise<void>,
    logoutCallback: (expired: boolean) => Promise<void>,
    customUserAgent: string = null
  ) {
    super(tokenService, platformUtilsService, environmentService, logoutCallback, customUserAgent);
  }

  doRefreshToken(): Promise<void> {
    return this.refreshTokenCallback();
  }
}
