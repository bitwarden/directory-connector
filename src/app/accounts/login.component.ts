import {
    Component,
    ComponentFactoryResolver,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';
import { Router } from '@angular/router';

import { EnvironmentComponent } from './environment.component';

import { AuthService } from 'jslib/abstractions/auth.service';
import { CryptoFunctionService } from 'jslib/abstractions/cryptoFunction.service';
import { EnvironmentService } from 'jslib/abstractions/environment.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { PasswordGenerationService } from 'jslib/abstractions/passwordGeneration.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';
import { StateService } from 'jslib/abstractions/state.service';
import { StorageService } from 'jslib/abstractions/storage.service';

import { LoginComponent as BaseLoginComponent } from 'jslib/angular/components/login.component';
import { ModalComponent } from 'jslib/angular/components/modal.component';

@Component({
    selector: 'app-login',
    templateUrl: 'login.component.html',
})
export class LoginComponent extends BaseLoginComponent {
    @ViewChild('environment', { read: ViewContainerRef, static: true }) environmentModal: ViewContainerRef;

    constructor(authService: AuthService, router: Router,
        i18nService: I18nService, private componentFactoryResolver: ComponentFactoryResolver,
        storageService: StorageService, stateService: StateService,
        platformUtilsService: PlatformUtilsService, environmentService: EnvironmentService,
        passwordGenerationService: PasswordGenerationService, cryptoFunctionService: CryptoFunctionService) {
        super(authService, router,
            platformUtilsService, i18nService,
            stateService, environmentService,
            passwordGenerationService, cryptoFunctionService,
            storageService);
        super.successRoute = '/tabs/dashboard';
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

    sso() {
        return super.launchSsoBrowser('connector', 'bwdc://sso-callback');
    }
}
