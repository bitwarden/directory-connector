import { Injectable } from "@angular/core";

import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";

import { StateService } from "../../abstractions/state.service";

@Injectable()
export class AuthGuardService {
  constructor(
    private stateService: StateService,
    private messagingService: MessagingService,
  ) {}

  async canActivate() {
    const isAuthed = await this.stateService.getIsAuthenticated();
    if (!isAuthed) {
      this.messagingService.send("logout");
      return false;
    }

    return true;
  }
}
