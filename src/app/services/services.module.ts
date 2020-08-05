import { remote } from 'electron';

import {
    APP_INITIALIZER,
    NgModule,
} from '@angular/core';

import { ToasterModule } from 'angular2-toaster';

import { ElectronLogService } from 'jslib/electron/services/electronLog.service';
import { ElectronPlatformUtilsService } from 'jslib/electron/services/electronPlatformUtils.service';
import { ElectronRendererMessagingService } from 'jslib/electron/services/electronRendererMessaging.service';
import { ElectronRendererSecureStorageService } from 'jslib/electron/services/electronRendererSecureStorage.service';
import { ElectronStorageService } from 'jslib/electron/services/electronStorage.service';

import { AuthGuardService } from './auth-guard.service';
import { LaunchGuardService } from './launch-guard.service';

import { ConfigurationService } from '../../services/configuration.service';
import { I18nService } from '../../services/i18n.service';
import { SyncService } from '../../services/sync.service';

import { BroadcasterService } from 'jslib/angular/services/broadcaster.service';
import { ValidationService } from 'jslib/angular/services/validation.service';

import { Analytics } from 'jslib/misc/analytics';

import { ApiService } from 'jslib/services/api.service';
import { AppIdService } from 'jslib/services/appId.service';
import { AuthService } from 'jslib/services/auth.service';
import { ConstantsService } from 'jslib/services/constants.service';
import { ContainerService } from 'jslib/services/container.service';
import { CryptoService } from 'jslib/services/crypto.service';
import { EnvironmentService } from 'jslib/services/environment.service';
import { NodeCryptoFunctionService } from 'jslib/services/nodeCryptoFunction.service';
import { PasswordGenerationService } from 'jslib/services/passwordGeneration.service';
import { StateService } from 'jslib/services/state.service';
import { TokenService } from 'jslib/services/token.service';
import { UserService } from 'jslib/services/user.service';

import { ApiService as ApiServiceAbstraction } from 'jslib/abstractions/api.service';
import { AppIdService as AppIdServiceAbstraction } from 'jslib/abstractions/appId.service';
import { AuthService as AuthServiceAbstraction } from 'jslib/abstractions/auth.service';
import { CryptoService as CryptoServiceAbstraction } from 'jslib/abstractions/crypto.service';
import { CryptoFunctionService as CryptoFunctionServiceAbstraction } from 'jslib/abstractions/cryptoFunction.service';
import { EnvironmentService as EnvironmentServiceAbstraction } from 'jslib/abstractions/environment.service';
import { I18nService as I18nServiceAbstraction } from 'jslib/abstractions/i18n.service';
import { LogService as LogServiceAbstraction } from 'jslib/abstractions/log.service';
import { MessagingService as MessagingServiceAbstraction } from 'jslib/abstractions/messaging.service';
import {
    PasswordGenerationService as PasswordGenerationServiceAbstraction,
} from 'jslib/abstractions/passwordGeneration.service';
import { PlatformUtilsService as PlatformUtilsServiceAbstraction } from 'jslib/abstractions/platformUtils.service';
import { StateService as StateServiceAbstraction } from 'jslib/abstractions/state.service';
import { StorageService as StorageServiceAbstraction } from 'jslib/abstractions/storage.service';
import { TokenService as TokenServiceAbstraction } from 'jslib/abstractions/token.service';
import { UserService as UserServiceAbstraction } from 'jslib/abstractions/user.service';

const logService = new ElectronLogService();
const i18nService = new I18nService(window.navigator.language, './locales');
const stateService = new StateService();
const broadcasterService = new BroadcasterService();
const messagingService = new ElectronRendererMessagingService(broadcasterService);
const storageService: StorageServiceAbstraction = new ElectronStorageService(remote.app.getPath('userData'));
const platformUtilsService = new ElectronPlatformUtilsService(i18nService, messagingService, false, storageService);
const secureStorageService: StorageServiceAbstraction = new ElectronRendererSecureStorageService();
const cryptoFunctionService: CryptoFunctionServiceAbstraction = new NodeCryptoFunctionService();
const cryptoService = new CryptoService(storageService, secureStorageService, cryptoFunctionService);
const appIdService = new AppIdService(storageService);
const tokenService = new TokenService(storageService);
const apiService = new ApiService(tokenService, platformUtilsService,
    async (expired: boolean) => messagingService.send('logout', { expired: expired }));
const environmentService = new EnvironmentService(apiService, storageService, null);
const userService = new UserService(tokenService, storageService);
const containerService = new ContainerService(cryptoService);
const authService = new AuthService(cryptoService, apiService, userService, tokenService, appIdService,
    i18nService, platformUtilsService, messagingService, null, false);
const configurationService = new ConfigurationService(storageService, secureStorageService);
const syncService = new SyncService(configurationService, logService, cryptoFunctionService, apiService,
    messagingService, i18nService);
const passwordGenerationService = new PasswordGenerationService(cryptoService, storageService, null);

const analytics = new Analytics(window, () => true, platformUtilsService, storageService, appIdService);
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
        const currentVersion = platformUtilsService.getApplicationVersion();
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
        { provide: MessagingServiceAbstraction, useValue: messagingService },
        { provide: BroadcasterService, useValue: broadcasterService },
        { provide: StorageServiceAbstraction, useValue: storageService },
        { provide: StateServiceAbstraction, useValue: stateService },
        { provide: LogServiceAbstraction, useValue: logService },
        { provide: ConfigurationService, useValue: configurationService },
        { provide: SyncService, useValue: syncService },
        { provide: PasswordGenerationServiceAbstraction, useValue: passwordGenerationService },
        { provide: CryptoFunctionServiceAbstraction, useValue: cryptoFunctionService },
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
