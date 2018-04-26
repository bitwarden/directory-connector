import { Injectable } from '@angular/core';
import {
    CanActivate,
    Router,
} from '@angular/router';

import { UserService } from 'jslib/abstractions/user.service';

@Injectable()
export class LaunchGuardService implements CanActivate {
    constructor(private userService: UserService, private router: Router) { }

    async canActivate() {
        const isAuthed = await this.userService.isAuthenticated();
        if (!isAuthed) {
            return true;
        }

        this.router.navigate(['/tabs/dashboard']);
        return false;
    }
}
