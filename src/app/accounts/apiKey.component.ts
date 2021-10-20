import {
    Component,
    Input,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { Router } from '@angular/router';

import { EnvironmentComponent } from './environment.component';

import { ActiveAccountService } from 'jslib-common/abstractions/activeAccount.service';
import { AuthService } from 'jslib-common/abstractions/auth.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';

import { ModalService } from 'jslib-angular/services/modal.service';

import { Utils } from 'jslib-common/misc/utils';
import { ConfigurationService } from '../../services/configuration.service';

import { StorageKey } from 'jslib-common/enums/storageKey';

@Component({
    selector: 'app-apiKey',
    templateUrl: 'apiKey.component.html',
})
export class ApiKeyComponent {
    @ViewChild('environment', { read: ViewContainerRef, static: true }) environmentModal: ViewContainerRef;
    @Input() clientId: string = '';
    @Input() clientSecret: string = '';

    formPromise: Promise<any>;
    successRoute = '/tabs/dashboard';
    showSecret: boolean = false;

    constructor(private authService: AuthService, private activeAccount: ActiveAccountService,
        private router: Router, private i18nService: I18nService,
        private configurationService: ConfigurationService, private platformUtilsService: PlatformUtilsService,
        private modalService: ModalService) { }

    async submit() {
        if (this.clientId == null || this.clientId === '') {
            this.platformUtilsService.showToast('error', this.i18nService.t('errorOccurred'),
                this.i18nService.t('clientIdRequired'));
            return;
        }
        if (!this.clientId.startsWith('organization')) {
            this.platformUtilsService.showToast('error', this.i18nService.t('errorOccurred'),
                this.i18nService.t('orgApiKeyRequired'));
            return;
        }
        if (this.clientSecret == null || this.clientSecret === '') {
            this.platformUtilsService.showToast('error', this.i18nService.t('errorOccurred'),
                this.i18nService.t('clientSecretRequired'));
            return;
        }
        const idParts = this.clientId.split('.');

        if (idParts.length !== 2 || idParts[0] !== 'organization' || !Utils.isGuid(idParts[1])) {
            this.platformUtilsService.showToast('error', this.i18nService.t('errorOccurred'),
                this.i18nService.t('invalidClientId'));
            return;
        }

        try {
            this.formPromise = this.authService.logInApiKey(this.clientId, this.clientSecret);
            await this.formPromise;
            const organizationId = await this.activeAccount.getInformation<string>(StorageKey.EntityId);
            await this.configurationService.saveOrganizationId(organizationId);
            this.router.navigate([this.successRoute]);
        } catch { }
    }

    async settings() {
        const [modalRef, childComponent] = await this.modalService.openViewRef(EnvironmentComponent, this.environmentModal);

        childComponent.onSaved.subscribe(() => {
            modalRef.close();
        });
    }

    toggleSecret() {
        this.showSecret = !this.showSecret;
        document.getElementById('client_secret').focus();
    }
}
