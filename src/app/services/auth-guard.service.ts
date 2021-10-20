import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';

import { ActiveAccountService } from 'jslib-common/abstractions/activeAccount.service';
import { MessagingService } from 'jslib-common/abstractions/messaging.service';

@Injectable()
export class AuthGuardService implements CanActivate {
    constructor(private activeAccount: ActiveAccountService, private messagingService: MessagingService) { }

    async canActivate() {
        if (!this.activeAccount.isAuthenticated) {
            console.log('logging out');
            this.messagingService.send('logout');
            return false;
        }

        return true;
    }
}
