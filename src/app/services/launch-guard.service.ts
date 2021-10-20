import { Injectable } from '@angular/core';
import {
    CanActivate,
    Router,
} from '@angular/router';

import { ActiveAccountService } from 'jslib-common/abstractions/activeAccount.service';

@Injectable()
export class LaunchGuardService implements CanActivate {
    constructor(private activeAccount: ActiveAccountService, private router: Router) { }

    async canActivate() {
        if (!this.activeAccount.isAuthenticated) {
            return true;
        }

        this.router.navigate(['/tabs/dashboard']);
        return false;
    }
}
