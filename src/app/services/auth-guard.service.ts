import { Injectable } from "@angular/core";
import { CanActivate } from "@angular/router";

import { MessagingService } from "jslib-common/abstractions/messaging.service";

import { StateService } from "../../abstractions/state.service";

@Injectable()
export class AuthGuardService implements CanActivate {
  constructor(private stateService: StateService, private messagingService: MessagingService) {}

  async canActivate() {
    const isAuthed = await this.stateService.getIsAuthenticated();
    if (!isAuthed) {
      this.messagingService.send("logout");
      return false;
    }

    return true;
  }
}
