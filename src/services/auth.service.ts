import { ApiService } from "@/jslib/common/src/abstractions/api.service";
import { AppIdService } from "@/jslib/common/src/abstractions/appId.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { PlatformUtilsService } from "@/jslib/common/src/abstractions/platformUtils.service";
import { TokenService } from "@/jslib/common/src/abstractions/token.service";
import { TwoFactorService } from "@/jslib/common/src/abstractions/twoFactor.service";
import { LogInStrategy } from "@/jslib/common/src/misc/logInStrategies/logIn.strategy";
import { AuthResult } from "@/jslib/common/src/models/domain/authResult";
import { ApiLogInCredentials } from "@/jslib/common/src/models/domain/logInCredentials";

import { StateService } from "../abstractions/state.service";

export class AuthService {
  constructor(
    private apiService: ApiService,
    private tokenService: TokenService,
    private appIdService: AppIdService,
    private platformUtilsService: PlatformUtilsService,
    private messagingService: MessagingService,
    private stateService: StateService,
    private twoFactorService: TwoFactorService,
  ) {}

  async logIn(credentials: ApiLogInCredentials): Promise<AuthResult> {
    const strategy = new LogInStrategy(
      this.apiService,
      this.tokenService,
      this.appIdService,
      this.platformUtilsService,
      this.stateService,
      this.twoFactorService,
    );

    return strategy.logIn(credentials);
  }

  logOut(callback: () => void) {
    callback();
    this.messagingService.send("loggedOut");
  }
}
