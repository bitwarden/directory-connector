import { Component } from '@angular/core';

import {
    ActivatedRoute,
    Router,
} from '@angular/router';

import { ApiService } from 'jslib/abstractions/api.service';
import { AuthService } from 'jslib/abstractions/auth.service';
import { CryptoFunctionService } from 'jslib/abstractions/cryptoFunction.service';
import { EnvironmentService } from 'jslib/abstractions/environment.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { MessagingService } from 'jslib/abstractions/messaging.service';
import { PasswordGenerationService } from 'jslib/abstractions/passwordGeneration.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';
import { StateService } from 'jslib/abstractions/state.service';
import { StorageService } from 'jslib/abstractions/storage.service';

import { SsoComponent as BaseSsoComponent } from 'jslib/angular/components/sso.component';

@Component({
    selector: 'app-sso',
    templateUrl: 'sso.component.html',
})
export class SsoComponent extends BaseSsoComponent {
    showMasterPassRedirect: boolean = false;

    constructor(authService: AuthService, router: Router,
        i18nService: I18nService, route: ActivatedRoute,
        storageService: StorageService, stateService: StateService,
        platformUtilsService: PlatformUtilsService, apiService: ApiService,
        cryptoFunctionService: CryptoFunctionService,
        passwordGenerationService: PasswordGenerationService, private messagingService: MessagingService,
        private environmentService: EnvironmentService) {
        super(authService, router, i18nService, route, storageService, stateService, platformUtilsService,
            apiService, cryptoFunctionService, passwordGenerationService);
        this.successRoute = '/tabs/dashboard';
        this.redirectUri = 'bwdc://sso-callback';
        this.clientId = 'connector';
        this.onSuccessfulLoginChangePasswordNavigate = this.redirectSetMasterPass;
    }

    async redirectSetMasterPass() {
        this.showMasterPassRedirect = true;
    }

    async launchWebVault() {
        const webUrl = this.environmentService.webVaultUrl == null ? 'https://vault.bitwarden.com' :
            this.environmentService.webVaultUrl;

        this.platformUtilsService.launchUri(webUrl);
    }

    async logOut() {
        const confirmed = await this.platformUtilsService.showDialog(this.i18nService.t('logOutConfirmation'),
            this.i18nService.t('logOut'), this.i18nService.t('logOut'), this.i18nService.t('cancel'));
        if (confirmed) {
            this.messagingService.send('logout');
        }
    }
}
