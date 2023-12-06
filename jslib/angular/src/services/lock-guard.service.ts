import { Injectable } from "@angular/core";
import { Router } from "@angular/router";

import { StateService } from "@/jslib/common/src/abstractions/state.service";
import { VaultTimeoutService } from "@/jslib/common/src/abstractions/vaultTimeout.service";

@Injectable()
export class LockGuardService  {
  protected homepage = "vault";
  protected loginpage = "login";
  constructor(
    private vaultTimeoutService: VaultTimeoutService,
    private router: Router,
    private stateService: StateService
  ) {}

  async canActivate() {
    if (await this.vaultTimeoutService.isLocked()) {
      return true;
    }

    const redirectUrl = (await this.stateService.getIsAuthenticated())
      ? [this.homepage]
      : [this.loginpage];

    this.router.navigate(redirectUrl);
    return false;
  }
}
