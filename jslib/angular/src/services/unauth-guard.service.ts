import { Injectable } from "@angular/core";
import { Router } from "@angular/router";

import { StateService } from "@/jslib/common/src/abstractions/state.service";

@Injectable()
export class UnauthGuardService  {
  protected homepage = "vault";
  constructor(
    private router: Router,
    private stateService: StateService,
  ) {}

  async canActivate() {
    const isAuthed = await this.stateService.getIsAuthenticated();
    if (isAuthed) {
      this.router.navigate([this.homepage]);
      return false;
    }
    return true;
  }
}
