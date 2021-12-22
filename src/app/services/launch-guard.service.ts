import { Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";

import { StateService } from "../../abstractions/state.service";

@Injectable()
export class LaunchGuardService implements CanActivate {
  constructor(private stateService: StateService, private router: Router) {}

  async canActivate() {
    const isAuthed = await this.stateService.getIsAuthenticated();
    if (!isAuthed) {
      return true;
    }

    this.router.navigate(["/tabs/dashboard"]);
    return false;
  }
}
