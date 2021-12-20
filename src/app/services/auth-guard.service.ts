import { Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";
import { ApiKeyService } from "jslib-common/abstractions/apiKey.service";

import { MessagingService } from "jslib-common/abstractions/messaging.service";

@Injectable()
export class AuthGuardService implements CanActivate {
    constructor(
        private apiKeyService: ApiKeyService,
        private router: Router,
        private messagingService: MessagingService
    ) {}

    async canActivate() {
        const isAuthed = await this.apiKeyService.isAuthenticated();
        if (!isAuthed) {
            this.messagingService.send("logout");
            return false;
        }

        return true;
    }
}
