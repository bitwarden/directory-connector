import { APP_INITIALIZER, Injector, NgModule } from "@angular/core";

import { ElectronLogService } from "jslib-electron/services/electronLog.service";
import { ElectronPlatformUtilsService } from "jslib-electron/services/electronPlatformUtils.service";
import { ElectronRendererMessagingService } from "jslib-electron/services/electronRendererMessaging.service";
import { ElectronRendererSecureStorageService } from "jslib-electron/services/electronRendererSecureStorage.service";
import { ElectronRendererStorageService } from "jslib-electron/services/electronRendererStorage.service";

import { AuthGuardService } from "./auth-guard.service";
import { LaunchGuardService } from "./launch-guard.service";

import { ConfigurationService } from "../../services/configuration.service";
import { I18nService } from "../../services/i18n.service";
import { SyncService } from "../../services/sync.service";

import { BroadcasterService } from "jslib-angular/services/broadcaster.service";
import { JslibServicesModule } from "jslib-angular/services/jslib-services.module";
import { ModalService } from "jslib-angular/services/modal.service";
import { ValidationService } from "jslib-angular/services/validation.service";

import { ApiKeyService } from "jslib-common/services/apiKey.service";
import { ConstantsService } from "jslib-common/services/constants.service";
import { ContainerService } from "jslib-common/services/container.service";

import { NodeCryptoFunctionService } from "jslib-node/services/nodeCryptoFunction.service";

import { ApiService as ApiServiceAbstraction } from "jslib-common/abstractions/api.service";
import { ApiKeyService as ApiKeyServiceAbstraction } from "jslib-common/abstractions/apiKey.service";
import { AppIdService as AppIdServiceAbstraction } from "jslib-common/abstractions/appId.service";
import { AuthService as AuthServiceAbstraction } from "jslib-common/abstractions/auth.service";
import { BroadcasterService as BroadcasterServiceAbstraction } from "jslib-common/abstractions/broadcaster.service";
import { CryptoService as CryptoServiceAbstraction } from "jslib-common/abstractions/crypto.service";
import { CryptoFunctionService as CryptoFunctionServiceAbstraction } from "jslib-common/abstractions/cryptoFunction.service";
import { EnvironmentService as EnvironmentServiceAbstraction } from "jslib-common/abstractions/environment.service";
import { I18nService as I18nServiceAbstraction } from "jslib-common/abstractions/i18n.service";
import { KeyConnectorService as KeyConnectorServiceAbstraction } from "jslib-common/abstractions/keyConnector.service";
import { LogService as LogServiceAbstraction } from "jslib-common/abstractions/log.service";
import { MessagingService as MessagingServiceAbstraction } from "jslib-common/abstractions/messaging.service";
import { PasswordGenerationService as PasswordGenerationServiceAbstraction } from "jslib-common/abstractions/passwordGeneration.service";
import { PlatformUtilsService as PlatformUtilsServiceAbstraction } from "jslib-common/abstractions/platformUtils.service";
import { PolicyService as PolicyServiceAbstraction } from "jslib-common/abstractions/policy.service";
import { StateService as StateServiceAbstraction } from "jslib-common/abstractions/state.service";
import { StorageService as StorageServiceAbstraction } from "jslib-common/abstractions/storage.service";
import { TokenService as TokenServiceAbstraction } from "jslib-common/abstractions/token.service";
import { UserService as UserServiceAbstraction } from "jslib-common/abstractions/user.service";
import { VaultTimeoutService as VaultTimeoutServiceAbstraction } from "jslib-common/abstractions/vaultTimeout.service";

import { ApiService, refreshToken } from "../../services/api.service";
import { AuthService } from "../../services/auth.service";

function refreshTokenCallback(injector: Injector) {
  return () => {
    const apiKeyService = injector.get(ApiKeyServiceAbstraction);
    const authService = injector.get(AuthServiceAbstraction);
    return refreshToken(apiKeyService, authService);
  };
}

export function initFactory(
  environmentService: EnvironmentServiceAbstraction,
  i18nService: I18nService,
  authService: AuthService,
  platformUtilsService: PlatformUtilsServiceAbstraction,
  storageService: StorageServiceAbstraction,
  userService: UserServiceAbstraction,
  apiService: ApiServiceAbstraction,
  stateService: StateServiceAbstraction,
  cryptoService: CryptoServiceAbstraction
): Function {
  return async () => {
    await environmentService.setUrlsFromStorage();
    await i18nService.init();
    authService.init();
    const htmlEl = window.document.documentElement;
    htmlEl.classList.add("os_" + platformUtilsService.getDeviceString());
    htmlEl.classList.add("locale_" + i18nService.translationLocale);
    window.document.title = i18nService.t("bitwardenDirectoryConnector");

    let installAction = null;
    const installedVersion = await storageService.get<string>(ConstantsService.installedVersionKey);
    const currentVersion = await platformUtilsService.getApplicationVersion();
    if (installedVersion == null) {
      installAction = "install";
    } else if (installedVersion !== currentVersion) {
      installAction = "update";
    }

    if (installAction != null) {
      await storageService.save(ConstantsService.installedVersionKey, currentVersion);
    }

    window.setTimeout(async () => {
      if (await userService.isAuthenticated()) {
        const profile = await apiService.getProfile();
        stateService.save("profileOrganizations", profile.organizations);
      }
    }, 500);

    const containerService = new ContainerService(cryptoService);
    containerService.attachToWindow(window);
  };
}

@NgModule({
  imports: [JslibServicesModule],
  declarations: [],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initFactory,
      deps: [
        EnvironmentServiceAbstraction,
        I18nServiceAbstraction,
        AuthServiceAbstraction,
        PlatformUtilsServiceAbstraction,
        StorageServiceAbstraction,
        UserServiceAbstraction,
        ApiServiceAbstraction,
        StateServiceAbstraction,
        CryptoServiceAbstraction,
      ],
      multi: true,
    },
    { provide: LogServiceAbstraction, useClass: ElectronLogService, deps: [] },
    {
      provide: I18nServiceAbstraction,
      useFactory: (window: Window) => new I18nService(window.navigator.language, "./locales"),
      deps: ["WINDOW"],
    },
    {
      provide: MessagingServiceAbstraction,
      useClass: ElectronRendererMessagingService,
      deps: [BroadcasterServiceAbstraction],
    },
    { provide: StorageServiceAbstraction, useClass: ElectronRendererStorageService },
    { provide: "SECURE_STORAGE", useClass: ElectronRendererSecureStorageService },
    {
      provide: PlatformUtilsServiceAbstraction,
      useFactory: (
        i18nService: I18nServiceAbstraction,
        messagingService: MessagingServiceAbstraction,
        storageService: StorageServiceAbstraction
      ) => new ElectronPlatformUtilsService(i18nService, messagingService, true, storageService),
      deps: [I18nServiceAbstraction, MessagingServiceAbstraction, StorageServiceAbstraction],
    },
    { provide: CryptoFunctionServiceAbstraction, useClass: NodeCryptoFunctionService, deps: [] },
    {
      provide: ApiServiceAbstraction,
      useFactory: (
        tokenService: TokenServiceAbstraction,
        platformUtilsService: PlatformUtilsServiceAbstraction,
        environmentService: EnvironmentServiceAbstraction,
        messagingService: MessagingServiceAbstraction,
        injector: Injector
      ) =>
        new ApiService(
          tokenService,
          platformUtilsService,
          environmentService,
          refreshTokenCallback(injector),
          async (expired: boolean) => messagingService.send("logout", { expired: expired })
        ),
      deps: [
        TokenServiceAbstraction,
        PlatformUtilsServiceAbstraction,
        EnvironmentServiceAbstraction,
        MessagingServiceAbstraction,
        Injector,
      ],
    },
    {
      provide: ApiKeyServiceAbstraction,
      useClass: ApiKeyService,
      deps: [TokenServiceAbstraction, StorageServiceAbstraction],
    },
    {
      provide: AuthServiceAbstraction,
      useClass: AuthService,
      deps: [
        CryptoServiceAbstraction,
        ApiServiceAbstraction,
        UserServiceAbstraction,
        TokenServiceAbstraction,
        AppIdServiceAbstraction,
        I18nServiceAbstraction,
        PlatformUtilsServiceAbstraction,
        MessagingServiceAbstraction,
        VaultTimeoutServiceAbstraction,
        LogServiceAbstraction,
        ApiKeyServiceAbstraction,
        CryptoFunctionServiceAbstraction,
        EnvironmentServiceAbstraction,
        KeyConnectorServiceAbstraction,
      ],
    },
    {
      provide: ConfigurationService,
      useClass: ConfigurationService,
      deps: [StorageServiceAbstraction, "SECURE_STORAGE"],
    },
    {
      provide: SyncService,
      useClass: SyncService,
      deps: [
        ConfigurationService,
        LogServiceAbstraction,
        CryptoFunctionServiceAbstraction,
        ApiServiceAbstraction,
        MessagingServiceAbstraction,
        I18nServiceAbstraction,
        EnvironmentServiceAbstraction,
      ],
    },
    AuthGuardService,
    LaunchGuardService,
  ],
})
export class ServicesModule {}
