import { ApiService } from "@/jslib/common/src/abstractions/api.service";
import { AppIdService } from "@/jslib/common/src/abstractions/appId.service";
import { CryptoService } from "@/jslib/common/src/abstractions/crypto.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { PlatformUtilsService } from "@/jslib/common/src/abstractions/platformUtils.service";
import { TokenService } from "@/jslib/common/src/abstractions/token.service";
import { TwoFactorService } from "@/jslib/common/src/abstractions/twoFactor.service";
import { AuthResult } from "@/jslib/common/src/models/domain/authResult";
import { ApiLogInCredentials } from "@/jslib/common/src/models/domain/logInCredentials";

import { StateService } from "../abstractions/state.service";
import { OrganizationLogInStrategy } from "../misc/logInStrategies/organizationLogIn.strategy";

export class AuthService {
  constructor(
    private cryptoService: CryptoService,
    private apiService: ApiService,
    private tokenService: TokenService,
    private appIdService: AppIdService,
    private platformUtilsService: PlatformUtilsService,
    private messagingService: MessagingService,
    private logService: LogService,
    private stateService: StateService,
    private twoFactorService: TwoFactorService,
  ) {}

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
      this.twoFactorService,
    );

    return strategy.logIn(credentials);
  }

  logOut(callback: () => void) {
    callback();
    this.messagingService.send("loggedOut");
  }
}
