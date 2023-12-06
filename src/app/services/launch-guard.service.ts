import { Injectable } from "@angular/core";
import { Router } from "@angular/router";

import { StateService } from "../../abstractions/state.service";

@Injectable()
export class LaunchGuardService {
  constructor(
    private stateService: StateService,
    private router: Router,
  ) {}

  async canActivate() {
    const isAuthed = await this.stateService.getIsAuthenticated();
    if (!isAuthed) {
      return true;
    }

    this.router.navigate(["/tabs/dashboard"]);
    return false;
  }
}
