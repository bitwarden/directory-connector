import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from "@angular/router";

import { KeyConnectorService } from "jslib-common/abstractions/keyConnector.service";
import { MessagingService } from "jslib-common/abstractions/messaging.service";
import { StateService } from "jslib-common/abstractions/state.service";
import { VaultTimeoutService } from "jslib-common/abstractions/vaultTimeout.service";

@Injectable()
export class AuthGuardService implements CanActivate {
  constructor(
    private vaultTimeoutService: VaultTimeoutService,
    private router: Router,
    private messagingService: MessagingService,
    private keyConnectorService: KeyConnectorService,
    private stateService: StateService
  ) {}

  async canActivate(route: ActivatedRouteSnapshot, routerState: RouterStateSnapshot) {
    const isAuthed = await this.stateService.getIsAuthenticated();
    if (!isAuthed) {
      this.messagingService.send("authBlocked");
      return false;
    }

    const locked = await this.vaultTimeoutService.isLocked();
    if (locked) {
      if (routerState != null) {
        this.messagingService.send("lockedUrl", { url: routerState.url });
      }
      this.router.navigate(["lock"], { queryParams: { promptBiometric: true } });
      return false;
    }

    if (
      !routerState.url.includes("remove-password") &&
      (await this.keyConnectorService.getConvertAccountRequired())
    ) {
      this.router.navigate(["/remove-password"]);
      return false;
    }

    return true;
  }
}
