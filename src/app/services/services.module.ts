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
import { ValidationService } from 'jslib-angular/services/validation.service';

import { ApiService } from 'jslib-common/services/api.service';
import { ApiKeyService } from 'jslib-common/services/apiKey.service';
import { AppIdService } from 'jslib-common/services/appId.service';
import { ConstantsService } from 'jslib-common/services/constants.service';
import { ContainerService } from 'jslib-common/services/container.service';
import { CryptoService } from 'jslib-common/services/crypto.service';
import { EnvironmentService } from 'jslib-common/services/environment.service';
import { PasswordGenerationService } from 'jslib-common/services/passwordGeneration.service';
import { PolicyService } from 'jslib-common/services/policy.service';
import { StateService } from 'jslib-common/services/state.service';
import { TokenService } from 'jslib-common/services/token.service';
import { UserService } from 'jslib-common/services/user.service';

import { NodeCryptoFunctionService } from 'jslib-node/services/nodeCryptoFunction.service';

import { ApiService as ApiServiceAbstraction } from 'jslib-common/abstractions/api.service';
import { ApiKeyService as ApiKeyServiceAbstraction } from 'jslib-common/abstractions/apiKey.service';
import { AuthService as AuthServiceAbstraction } from 'jslib-common/abstractions/auth.service';
import { CryptoService as CryptoServiceAbstraction } from 'jslib-common/abstractions/crypto.service';
import { CryptoFunctionService as CryptoFunctionServiceAbstraction } from 'jslib-common/abstractions/cryptoFunction.service';
import { EnvironmentService as EnvironmentServiceAbstraction } from 'jslib-common/abstractions/environment.service';
import { I18nService as I18nServiceAbstraction } from 'jslib-common/abstractions/i18n.service';
import { LogService as LogServiceAbstraction } from 'jslib-common/abstractions/log.service';
import { MessagingService as MessagingServiceAbstraction } from 'jslib-common/abstractions/messaging.service';
import {
    PasswordGenerationService as PasswordGenerationServiceAbstraction,
} from 'jslib-common/abstractions/passwordGeneration.service';
import { PlatformUtilsService as PlatformUtilsServiceAbstraction } from 'jslib-common/abstractions/platformUtils.service';
import { PolicyService as PolicyServiceAbstraction } from 'jslib-common/abstractions/policy.service';
import { StateService as StateServiceAbstraction } from 'jslib-common/abstractions/state.service';
import { StorageService as StorageServiceAbstraction } from 'jslib-common/abstractions/storage.service';
import { TokenService as TokenServiceAbstraction } from 'jslib-common/abstractions/token.service';
import { UserService as UserServiceAbstraction } from 'jslib-common/abstractions/user.service';

import { AuthService } from '../../services/auth.service';

const logService = new ElectronLogService();
const i18nService = new I18nService(window.navigator.language, './locales');
const stateService = new StateService();
const broadcasterService = new BroadcasterService();
const messagingService = new ElectronRendererMessagingService(broadcasterService);
const storageService: StorageServiceAbstraction = new ElectronRendererStorageService();
const platformUtilsService = new ElectronPlatformUtilsService(i18nService, messagingService, false, storageService);
const secureStorageService: StorageServiceAbstraction = new ElectronRendererSecureStorageService();
const cryptoFunctionService: CryptoFunctionServiceAbstraction = new NodeCryptoFunctionService();
const cryptoService = new CryptoService(storageService, secureStorageService, cryptoFunctionService,
    platformUtilsService, logService);
const appIdService = new AppIdService(storageService);
const tokenService = new TokenService(storageService);
const apiService = new ApiService(tokenService, platformUtilsService,
    async (expired: boolean) => messagingService.send('logout', { expired: expired }));
const environmentService = new EnvironmentService(apiService, storageService, null);
const userService = new UserService(tokenService, storageService);
const apiKeyService = new ApiKeyService(tokenService, storageService);
const containerService = new ContainerService(cryptoService);
const authService = new AuthService(cryptoService, apiService, userService, tokenService, appIdService,
    i18nService, platformUtilsService, messagingService, null, logService, apiKeyService, false);
const configurationService = new ConfigurationService(storageService, secureStorageService);
const syncService = new SyncService(configurationService, logService, cryptoFunctionService, apiService,
    messagingService, i18nService);
const passwordGenerationService = new PasswordGenerationService(cryptoService, storageService, null);
const policyService = new PolicyService(userService, storageService);

containerService.attachToWindow(window);

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
        const installedVersion = await storageService.get<string>(ConstantsService.installedVersionKey);
        const currentVersion = await platformUtilsService.getApplicationVersion();
        if (installedVersion == null) {
            installAction = 'install';
        } else if (installedVersion !== currentVersion) {
            installAction = 'update';
        }

        if (installAction != null) {
            await storageService.save(ConstantsService.installedVersionKey, currentVersion);
        }

        window.setTimeout(async () => {
            if (await userService.isAuthenticated()) {
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
        { provide: AuthServiceAbstraction, useValue: authService },
        { provide: EnvironmentServiceAbstraction, useValue: environmentService },
        { provide: TokenServiceAbstraction, useValue: tokenService },
        { provide: I18nServiceAbstraction, useValue: i18nService },
        { provide: CryptoServiceAbstraction, useValue: cryptoService },
        { provide: PlatformUtilsServiceAbstraction, useValue: platformUtilsService },
        { provide: ApiServiceAbstraction, useValue: apiService },
        { provide: UserServiceAbstraction, useValue: userService },
        { provide: ApiKeyServiceAbstraction, useValue: apiKeyService },
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
