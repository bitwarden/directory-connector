import { Injectable } from '@angular/core';
import {
    CanActivate,
    Router,
} from '@angular/router';

import { MessagingService } from 'jslib/abstractions/messaging.service';
import { UserService } from 'jslib/abstractions/user.service';

@Injectable()
export class AuthGuardService implements CanActivate {
    constructor(private userService: UserService, private router: Router,
        private messagingService: MessagingService) { }

    async canActivate() {
        const isAuthed = await this.userService.isAuthenticated();
        if (!isAuthed) {
            this.messagingService.send('logout');
            return false;
        }

        return true;
    }
}
