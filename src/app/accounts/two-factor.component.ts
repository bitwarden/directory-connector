import {
    Component,
    ComponentFactoryResolver,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';

import { Router } from '@angular/router';

import { TwoFactorOptionsComponent } from './two-factor-options.component';

import { TwoFactorProviderType } from 'jslib/enums/twoFactorProviderType';

import { ApiService } from 'jslib/abstractions/api.service';
import { AuthService } from 'jslib/abstractions/auth.service';
import { EnvironmentService } from 'jslib/abstractions/environment.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';

import { ModalComponent } from 'jslib/angular/components/modal.component';
import { TwoFactorComponent as BaseTwoFactorComponent } from 'jslib/angular/components/two-factor.component';

@Component({
    selector: 'app-two-factor',
    templateUrl: 'two-factor.component.html',
})
export class TwoFactorComponent extends BaseTwoFactorComponent {
    @ViewChild('twoFactorOptions', { read: ViewContainerRef }) twoFactorOptionsModal: ViewContainerRef;

    constructor(authService: AuthService, router: Router,
        i18nService: I18nService, apiService: ApiService,
        platformUtilsService: PlatformUtilsService, environmentService: EnvironmentService,
        private componentFactoryResolver: ComponentFactoryResolver) {
        super(authService, router, i18nService, apiService, platformUtilsService, window, environmentService);
        super.successRoute = '/tabs/dashboard';
    }

    anotherMethod() {
        const factory = this.componentFactoryResolver.resolveComponentFactory(ModalComponent);
        const modal = this.twoFactorOptionsModal.createComponent(factory).instance;
        const childComponent = modal.show<TwoFactorOptionsComponent>(TwoFactorOptionsComponent,
            this.twoFactorOptionsModal);

        childComponent.onProviderSelected.subscribe(async (provider: TwoFactorProviderType) => {
            modal.close();
            this.selectedProviderType = provider;
            await this.init();
        });
        childComponent.onRecoverSelected.subscribe(() => {
            modal.close();
        });
    }
}
