import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from "@angular/router";

import { KeyConnectorService } from "@/jslib/common/src/abstractions/keyConnector.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { StateService } from "@/jslib/common/src/abstractions/state.service";
import { VaultTimeoutService } from "@/jslib/common/src/abstractions/vaultTimeout.service";

@Injectable()
export class AuthGuardService  {
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
