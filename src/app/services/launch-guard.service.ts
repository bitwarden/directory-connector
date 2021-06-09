import { Injectable } from '@angular/core';
import {
    CanActivate,
    Router,
} from '@angular/router';

import { ApiKeyService } from 'jslib-common/abstractions/apiKey.service';

@Injectable()
export class LaunchGuardService implements CanActivate {
    constructor(private apiKeyService: ApiKeyService, private router: Router) { }

    async canActivate() {
        const isAuthed = await this.apiKeyService.isAuthenticated();
        if (!isAuthed) {
            return true;
        }

        this.router.navigate(['/tabs/dashboard']);
        return false;
    }
}
