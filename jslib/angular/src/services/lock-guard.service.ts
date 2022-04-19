import { Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";

import { StateService } from "jslib-common/abstractions/state.service";
import { VaultTimeoutService } from "jslib-common/abstractions/vaultTimeout.service";

@Injectable()
export class LockGuardService implements CanActivate {
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
