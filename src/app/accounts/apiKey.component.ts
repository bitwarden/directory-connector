import {
    Component,
    ComponentFactoryResolver,
    Input,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { Router } from '@angular/router';

import { EnvironmentComponent } from './environment.component';

import { ApiKeyService } from 'jslib/abstractions/apiKey.service';
import { AuthService } from 'jslib/abstractions/auth.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';

import { ModalComponent } from 'jslib/angular/components/modal.component';
import { Utils } from 'jslib/misc/utils';
import { ConfigurationService } from '../../services/configuration.service';

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

    constructor(private authService: AuthService, private apiKeyService: ApiKeyService, private router: Router,
        private i18nService: I18nService, private componentFactoryResolver: ComponentFactoryResolver,
        private configurationService: ConfigurationService, private platformUtilsService: PlatformUtilsService) { }

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
            const organizationId = await this.apiKeyService.getEntityId();
            await this.configurationService.saveOrganizationId(organizationId);
            this.router.navigate([this.successRoute]);
        } catch { }
    }

    settings() {
        const factory = this.componentFactoryResolver.resolveComponentFactory(ModalComponent);
        const modal = this.environmentModal.createComponent(factory).instance;
        const childComponent = modal.show<EnvironmentComponent>(EnvironmentComponent,
            this.environmentModal);

        childComponent.onSaved.subscribe(() => {
            modal.close();
        });
    }
}
