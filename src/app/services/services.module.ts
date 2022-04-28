import { APP_INITIALIZER, NgModule } from "@angular/core";

import { JslibServicesModule } from "jslib-angular/services/jslib-services.module";
import { ApiService as ApiServiceAbstraction } from "jslib-common/abstractions/api.service";
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
import { PlatformUtilsService as PlatformUtilsServiceAbstraction } from "jslib-common/abstractions/platformUtils.service";
import { StateMigrationService as StateMigrationServiceAbstraction } from "jslib-common/abstractions/stateMigration.service";
import { StorageService as StorageServiceAbstraction } from "jslib-common/abstractions/storage.service";
import { TokenService as TokenServiceAbstraction } from "jslib-common/abstractions/token.service";
import { TwoFactorService as TwoFactorServiceAbstraction } from "jslib-common/abstractions/twoFactor.service";
import { StateFactory } from "jslib-common/factories/stateFactory";
import { GlobalState } from "jslib-common/models/domain/globalState";
import { ContainerService } from "jslib-common/services/container.service";
import { ElectronLogService } from "jslib-electron/services/electronLog.service";
import { ElectronPlatformUtilsService } from "jslib-electron/services/electronPlatformUtils.service";
import { ElectronRendererMessagingService } from "jslib-electron/services/electronRendererMessaging.service";
import { ElectronRendererSecureStorageService } from "jslib-electron/services/electronRendererSecureStorage.service";
import { ElectronRendererStorageService } from "jslib-electron/services/electronRendererStorage.service";
import { NodeApiService } from "jslib-node/services/nodeApi.service";
import { NodeCryptoFunctionService } from "jslib-node/services/nodeCryptoFunction.service";

import { StateService as StateServiceAbstraction } from "../../abstractions/state.service";
import { Account } from "../../models/account";
import { AuthService } from "../../services/auth.service";
import { I18nService } from "../../services/i18n.service";
import { NoopTwoFactorService } from "../../services/noop/noopTwoFactor.service";
import { StateService } from "../../services/state.service";
import { StateMigrationService } from "../../services/stateMigration.service";
import { SyncService } from "../../services/sync.service";

import { AuthGuardService } from "./auth-guard.service";
import { LaunchGuardService } from "./launch-guard.service";

export function initFactory(
  environmentService: EnvironmentServiceAbstraction,
  i18nService: I18nService,
  platformUtilsService: PlatformUtilsServiceAbstraction,
  stateService: StateServiceAbstraction,
  cryptoService: CryptoServiceAbstraction
): () => Promise<void> {
  return async () => {
    await stateService.init();
    await environmentService.setUrlsFromStorage();
    await i18nService.init();
    const htmlEl = window.document.documentElement;
    htmlEl.classList.add("os_" + platformUtilsService.getDeviceString());
    htmlEl.classList.add("locale_" + i18nService.translationLocale);
    window.document.title = i18nService.t("bitwardenDirectoryConnector");

    let installAction = null;
    const installedVersion = await stateService.getInstalledVersion();
    const currentVersion = await platformUtilsService.getApplicationVersion();
    if (installedVersion == null) {
      installAction = "install";
    } else if (installedVersion !== currentVersion) {
      installAction = "update";
    }

    if (installAction != null) {
      await stateService.setInstalledVersion(currentVersion);
    }

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
        PlatformUtilsServiceAbstraction,
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
        stateService: StateServiceAbstraction
      ) => new ElectronPlatformUtilsService(i18nService, messagingService, false, stateService),
      deps: [I18nServiceAbstraction, MessagingServiceAbstraction, StateServiceAbstraction],
    },
    { provide: CryptoFunctionServiceAbstraction, useClass: NodeCryptoFunctionService, deps: [] },
    {
      provide: ApiServiceAbstraction,
      useFactory: (
        tokenService: TokenServiceAbstraction,
        platformUtilsService: PlatformUtilsServiceAbstraction,
        environmentService: EnvironmentServiceAbstraction,
        messagingService: MessagingServiceAbstraction,
        appIdService: AppIdServiceAbstraction
      ) =>
        new NodeApiService(
          tokenService,
          platformUtilsService,
          environmentService,
          appIdService,
          async (expired: boolean) => messagingService.send("logout", { expired: expired }),
          "Bitwarden_DC/" +
            platformUtilsService.getApplicationVersion() +
            " (" +
            platformUtilsService.getDeviceString().toUpperCase() +
            ")"
        ),
      deps: [
        TokenServiceAbstraction,
        PlatformUtilsServiceAbstraction,
        EnvironmentServiceAbstraction,
        MessagingServiceAbstraction,
        AppIdServiceAbstraction,
      ],
    },
    {
      provide: AuthServiceAbstraction,
      useClass: AuthService,
      deps: [
        CryptoServiceAbstraction,
        ApiServiceAbstraction,
        TokenServiceAbstraction,
        AppIdServiceAbstraction,
        PlatformUtilsServiceAbstraction,
        MessagingServiceAbstraction,
        LogServiceAbstraction,
        KeyConnectorServiceAbstraction,
        EnvironmentServiceAbstraction,
        StateServiceAbstraction,
        TwoFactorServiceAbstraction,
        I18nServiceAbstraction,
      ],
    },
    {
      provide: SyncService,
      useClass: SyncService,
      deps: [
        LogServiceAbstraction,
        CryptoFunctionServiceAbstraction,
        ApiServiceAbstraction,
        MessagingServiceAbstraction,
        I18nServiceAbstraction,
        EnvironmentServiceAbstraction,
        StateServiceAbstraction,
      ],
    },
    AuthGuardService,
    LaunchGuardService,
    {
      provide: StateMigrationServiceAbstraction,
      useFactory: (
        storageService: StorageServiceAbstraction,
        secureStorageService: StorageServiceAbstraction
      ) =>
        new StateMigrationService(
          storageService,
          secureStorageService,
          new StateFactory(GlobalState, Account)
        ),
      deps: [StorageServiceAbstraction, "SECURE_STORAGE"],
    },
    {
      provide: StateServiceAbstraction,
      useFactory: (
        storageService: StorageServiceAbstraction,
        secureStorageService: StorageServiceAbstraction,
        logService: LogServiceAbstraction,
        stateMigrationService: StateMigrationServiceAbstraction
      ) =>
        new StateService(
          storageService,
          secureStorageService,
          logService,
          stateMigrationService,
          true,
          new StateFactory(GlobalState, Account)
        ),
      deps: [
        StorageServiceAbstraction,
        "SECURE_STORAGE",
        LogServiceAbstraction,
        StateMigrationServiceAbstraction,
      ],
    },
    {
      provide: TwoFactorServiceAbstraction,
      useClass: NoopTwoFactorService,
    },
  ],
})
export class ServicesModule {}
