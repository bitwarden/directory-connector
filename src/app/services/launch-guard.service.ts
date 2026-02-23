import { Injectable } from "@angular/core";
import { Router } from "@angular/router";

import { StateServiceVNext } from "../../abstractions/state-vNext.service";

@Injectable()
export class LaunchGuardService {
  constructor(
    private stateService: StateServiceVNext,
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
