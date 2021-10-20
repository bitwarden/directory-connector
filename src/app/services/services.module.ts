import {
    APP_INITIALIZER,
    NgModule,
} from '@angular/core';

import { ToasterModule } from 'angular2-toaster';

import { ElectronLogService } from 'jslib-electron/services/electronLog.service';
import { ElectronPlatformUtilsService } from 'jslib-electron/services/electronPlatformUtils.service';
import { ElectronRendererMessagingService } from 'jslib-electron/services/electronRendererMessaging.service';
import { ElectronRendererSecureStorageService } from 'jslib-electron/services/electronRendererSecureStorage.service';
import { ElectronRendererStorageService } from 'jslib-electron/services/electronRendererStorage.service';

import { AuthGuardService } from './auth-guard.service';
import { LaunchGuardService } from './launch-guard.service';

import { ConfigurationService } from '../../services/configuration.service';
import { I18nService } from '../../services/i18n.service';
import { SyncService } from '../../services/sync.service';

import { BroadcasterService } from 'jslib-angular/services/broadcaster.service';
import { ModalService } from 'jslib-angular/services/modal.service';
import { ValidationService } from 'jslib-angular/services/validation.service';

import { AccountsManagementService } from 'jslib-common/services/accountsManagement.service';
import { ActiveAccountService } from 'jslib-common/services/activeAccount.service';
import { AppIdService } from 'jslib-common/services/appId.service';
import { ContainerService } from 'jslib-common/services/container.service';
import { CryptoService } from 'jslib-common/services/crypto.service';
import { EnvironmentService } from 'jslib-common/services/environment.service';
import { OrganizationService } from 'jslib-common/services/organization.service';
import { PasswordGenerationService } from 'jslib-common/services/passwordGeneration.service';
import { PolicyService } from 'jslib-common/services/policy.service';
import { ProviderService } from 'jslib-common/services/provider.service';
import { StateService } from 'jslib-common/services/state.service';
import { StoreService } from 'jslib-common/services/store.service';
import { TokenService } from 'jslib-common/services/token.service';

import { NodeCryptoFunctionService } from 'jslib-node/services/nodeCryptoFunction.service';

import { AccountsManagementService as AccountsManagementServiceAbstraction } from 'jslib-common/abstractions/accountsManagement.service';
import { ActiveAccountService as ActiveAccountServiceAbstraction } from 'jslib-common/abstractions/activeAccount.service';
import { ApiService as ApiServiceAbstraction } from 'jslib-common/abstractions/api.service';
import { AuthService as AuthServiceAbstraction } from 'jslib-common/abstractions/auth.service';
import { CryptoFunctionService as CryptoFunctionServiceAbstraction } from 'jslib-common/abstractions/cryptoFunction.service';
import { CryptoService as CryptoServiceAbstraction } from 'jslib-common/abstractions/crypto.service';
import { EnvironmentService as EnvironmentServiceAbstraction } from 'jslib-common/abstractions/environment.service';
import { I18nService as I18nServiceAbstraction } from 'jslib-common/abstractions/i18n.service';
import { LogService as LogServiceAbstraction } from 'jslib-common/abstractions/log.service';
import { MessagingService as MessagingServiceAbstraction } from 'jslib-common/abstractions/messaging.service';
import { OrganizationService as OrganizationServiceAbstraction } from 'jslib-common/abstractions/organization.service';
import { PasswordGenerationService as PasswordGenerationServiceAbstraction, } from 'jslib-common/abstractions/passwordGeneration.service';
import { PlatformUtilsService as PlatformUtilsServiceAbstraction } from 'jslib-common/abstractions/platformUtils.service';
import { PolicyService as PolicyServiceAbstraction } from 'jslib-common/abstractions/policy.service';
import { ProviderService as ProviderServiceAbstraction } from 'jslib-common/abstractions/provider.service';
import { StateService as StateServiceAbstraction } from 'jslib-common/abstractions/state.service';
import { StorageService as StorageServiceAbstraction } from 'jslib-common/abstractions/storage.service';
import { TokenService as TokenServiceAbstraction } from 'jslib-common/abstractions/token.service';

import { ApiService, refreshToken } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { StorageKey } from 'jslib-common/enums/storageKey';

const logService = new ElectronLogService();
const i18nService = new I18nService(window.navigator.language, './locales');
const stateService = new StateService();
const broadcasterService = new BroadcasterService();
const messagingService = new ElectronRendererMessagingService(broadcasterService);
const storageService: StorageServiceAbstraction = new ElectronRendererStorageService();
const secureStorageService: StorageServiceAbstraction = new ElectronRendererSecureStorageService();
const storeService = new StoreService(storageService, secureStorageService);
const accountsManagementService: AccountsManagementServiceAbstraction = new AccountsManagementService(storageService, secureStorageService);
const activeAccount: ActiveAccountServiceAbstraction = new ActiveAccountService(accountsManagementService, storeService);
const organizationService: OrganizationServiceAbstraction = new OrganizationService(activeAccount);
const providerService: ProviderServiceAbstraction = new ProviderService(activeAccount);
const platformUtilsService = new ElectronPlatformUtilsService(i18nService, messagingService, 
    false, storageService,
    activeAccount);
const cryptoFunctionService: CryptoFunctionServiceAbstraction = new NodeCryptoFunctionService();
const cryptoService = new CryptoService(cryptoFunctionService, platformUtilsService,
    logService, activeAccount);
const appIdService = new AppIdService(storageService);
const tokenService = new TokenService(activeAccount);
const environmentService = new EnvironmentService(activeAccount);
const apiService = new ApiService(tokenService, platformUtilsService, environmentService, refreshTokenCallback,
    async (expired: boolean) => messagingService.send('logout', { expired: expired }));
const containerService = new ContainerService(cryptoService);
const authService = new AuthService(cryptoService, apiService,
    tokenService, appIdService,
    i18nService, platformUtilsService, 
    messagingService, null,
    logService, accountsManagementService,
    activeAccount, false);
const configurationService = new ConfigurationService(storageService, secureStorageService);
const syncService = new SyncService(configurationService, logService, cryptoFunctionService, apiService,
    messagingService, i18nService, environmentService);
const policyService = new PolicyService(activeAccount, organizationService, apiService);
const passwordGenerationService = new PasswordGenerationService(cryptoService, policyService, activeAccount);

containerService.attachToWindow(window);

function refreshTokenCallback(): Promise<any> {
    return refreshToken(activeAccount, authService);
}

export function initFactory(): Function {
    return async () => {
        await environmentService.setUrlsFromStorage();
        await i18nService.init();
        authService.init();
        const htmlEl = window.document.documentElement;
        htmlEl.classList.add('os_' + platformUtilsService.getDeviceString());
        htmlEl.classList.add('locale_' + i18nService.translationLocale);
        window.document.title = i18nService.t('bitwardenDirectoryConnector');

        let installAction = null;
        const installedVersion = await storageService.get<string>(StorageKey.InstalledVersion);
        const currentVersion = await platformUtilsService.getApplicationVersion();
        if (installedVersion == null) {
            installAction = 'install';
        } else if (installedVersion !== currentVersion) {
            installAction = 'update';
        }

        if (installAction != null) {
            await storageService.save(StorageKey.InstalledVersion, currentVersion);
        }

        window.setTimeout(async () => {
            if (activeAccount.isAuthenticated) {
                const profile = await apiService.getProfile();
                stateService.save('profileOrganizations', profile.organizations);
            }
        }, 500);
    };
}

@NgModule({
    imports: [
        ToasterModule,
    ],
    declarations: [],
    providers: [
        ValidationService,
        AuthGuardService,
        LaunchGuardService,
        ModalService,
        { provide: AuthServiceAbstraction, useValue: authService },
        { provide: EnvironmentServiceAbstraction, useValue: environmentService },
        { provide: TokenServiceAbstraction, useValue: tokenService },
        { provide: I18nServiceAbstraction, useValue: i18nService },
        { provide: CryptoServiceAbstraction, useValue: cryptoService },
        { provide: PlatformUtilsServiceAbstraction, useValue: platformUtilsService },
        { provide: ApiServiceAbstraction, useValue: apiService },
        { provide: ActiveAccountServiceAbstraction, useValue: activeAccount },
        { provide: AccountsManagementServiceAbstraction, useValue: accountsManagementService },
        { provide: OrganizationServiceAbstraction, useValue: organizationService },
        { provide: ProviderServiceAbstraction, useValue: providerService },
        { provide: MessagingServiceAbstraction, useValue: messagingService },
        { provide: BroadcasterService, useValue: broadcasterService },
        { provide: StorageServiceAbstraction, useValue: storageService },
        { provide: StateServiceAbstraction, useValue: stateService },
        { provide: LogServiceAbstraction, useValue: logService },
        { provide: ConfigurationService, useValue: configurationService },
        { provide: SyncService, useValue: syncService },
        { provide: PasswordGenerationServiceAbstraction, useValue: passwordGenerationService },
        { provide: CryptoFunctionServiceAbstraction, useValue: cryptoFunctionService },
        { provide: PolicyServiceAbstraction, useValue: policyService },
        {
            provide: APP_INITIALIZER,
            useFactory: initFactory,
            deps: [],
            multi: true,
        },
    ],
})
export class ServicesModule {
}
