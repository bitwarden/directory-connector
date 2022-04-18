import { AuthResult } from "jslib-common/models/domain/authResult";
import { ApiLogInCredentials } from "jslib-common/models/domain/logInCredentials";
import { AuthService as AuthServiceBase } from "jslib-common/services/auth.service";

import { OrganizationLogInStrategy } from "../misc/logInStrategies/organizationLogIn.strategy";

export class AuthService extends AuthServiceBase {
  async logIn(credentials: ApiLogInCredentials): Promise<AuthResult> {
    const strategy = new OrganizationLogInStrategy(
      this.cryptoService,
      this.apiService,
      this.tokenService,
      this.appIdService,
      this.platformUtilsService,
      this.messagingService,
      this.logService,
      this.stateService,
      this.twoFactorService
    );

    return strategy.logIn(credentials);
  }
}
