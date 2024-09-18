import { ApiService } from "@/jslib/common/src/abstractions/api.service";
import { AppIdService } from "@/jslib/common/src/abstractions/appId.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { PlatformUtilsService } from "@/jslib/common/src/abstractions/platformUtils.service";
import { LogInStrategy } from "@/jslib/common/src/misc/logInStrategies/logIn.strategy";
import { AuthResult } from "@/jslib/common/src/models/domain/authResult";
import { ApiLogInCredentials } from "@/jslib/common/src/models/domain/logInCredentials";

import { StateService } from "../abstractions/state.service";

export class AuthService {
  constructor(
    private apiService: ApiService,
    private appIdService: AppIdService,
    private platformUtilsService: PlatformUtilsService,
    private messagingService: MessagingService,
    private stateService: StateService,
  ) {}

  async logIn(credentials: ApiLogInCredentials): Promise<AuthResult> {
    const strategy = new LogInStrategy(
      this.apiService,
      this.appIdService,
      this.platformUtilsService,
      this.stateService,
    );

    return strategy.logIn(credentials);
  }

  logOut(callback: () => void) {
    callback();
    this.messagingService.send("loggedOut");
  }
}
