import { Injectable } from "@angular/core";
import { Router } from "@angular/router";

import { RendererStateService } from "@/src-gui/services/electron/rendererState.service";

@Injectable()
export class LaunchGuardService {
  constructor(
    private stateService: RendererStateService,
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
