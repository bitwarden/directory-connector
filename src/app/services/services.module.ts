import { APP_INITIALIZER, NgModule } from "@angular/core";

import { JslibServicesModule } from "@/jslib/angular/src/services/jslib-services.module";
import { ApiService as ApiServiceAbstraction } from "@/jslib/common/src/abstractions/api.service";
import { AppIdService as AppIdServiceAbstraction } from "@/jslib/common/src/abstractions/appId.service";
import { BatchingService as BatchingServiceAbstraction } from "@/jslib/common/src/abstractions/batching.service";
import { BroadcasterService as BroadcasterServiceAbstraction } from "@/jslib/common/src/abstractions/broadcaster.service";
import { CryptoService as CryptoServiceAbstraction } from "@/jslib/common/src/abstractions/crypto.service";
import { CryptoFunctionService as CryptoFunctionServiceAbstraction } from "@/jslib/common/src/abstractions/cryptoFunction.service";
import { EnvironmentService as EnvironmentServiceAbstraction } from "@/jslib/common/src/abstractions/environment.service";
import { I18nService as I18nServiceAbstraction } from "@/jslib/common/src/abstractions/i18n.service";
import { LogService as LogServiceAbstraction } from "@/jslib/common/src/abstractions/log.service";
import { MessagingService as MessagingServiceAbstraction } from "@/jslib/common/src/abstractions/messaging.service";
import { PlatformUtilsService as PlatformUtilsServiceAbstraction } from "@/jslib/common/src/abstractions/platformUtils.service";
import { StateMigrationService as StateMigrationServiceAbstraction } from "@/jslib/common/src/abstractions/stateMigration.service";
import { StorageService as StorageServiceAbstraction } from "@/jslib/common/src/abstractions/storage.service";
import { TokenService as TokenServiceAbstraction } from "@/jslib/common/src/abstractions/token.service";
import { StateFactory } from "@/jslib/common/src/factories/stateFactory";
import { GlobalState } from "@/jslib/common/src/models/domain/globalState";
import { ContainerService } from "@/jslib/common/src/services/container.service";
import { ElectronLogService } from "@/jslib/electron/src/services/electronLog.service";
import { ElectronPlatformUtilsService } from "@/jslib/electron/src/services/electronPlatformUtils.service";
import { ElectronRendererMessagingService } from "@/jslib/electron/src/services/electronRendererMessaging.service";
import { ElectronRendererSecureStorageService } from "@/jslib/electron/src/services/electronRendererSecureStorage.service";
import { ElectronRendererStorageService } from "@/jslib/electron/src/services/electronRendererStorage.service";
import { NodeApiService } from "@/jslib/node/src/services/nodeApi.service";
import { NodeCryptoFunctionService } from "@/jslib/node/src/services/nodeCryptoFunction.service";

import { AuthService as AuthServiceAbstraction } from "../../abstractions/auth.service";
import { StateService as StateServiceAbstraction } from "../../abstractions/state.service";
import { Account } from "../../models/account";
import { AuthService } from "../../services/auth.service";
import { I18nService } from "../../services/i18n.service";
import { StateService } from "../../services/state.service";
import { StateMigrationService } from "../../services/stateMigration.service";
import { SyncService } from "../../services/sync.service";

import { AuthGuardService } from "./auth-guard.service";
import { SafeInjectionToken, SECURE_STORAGE, WINDOW } from "./injection-tokens";
import { LaunchGuardService } from "./launch-guard.service";
import { SafeProvider, safeProvider } from "./safe-provider";

export function initFactory(
  environmentService: EnvironmentServiceAbstraction,
  i18nService: I18nServiceAbstraction,
  platformUtilsService: PlatformUtilsServiceAbstraction,
  stateService: StateServiceAbstraction,
  cryptoService: CryptoServiceAbstraction,
): () => Promise<void> {
  return async () => {
    await stateService.init();
    await environmentService.setUrlsFromStorage();
    await (i18nService as I18nService).init();
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
    safeProvider({
      provide: APP_INITIALIZER as SafeInjectionToken<() => void>,
      useFactory: initFactory,
      deps: [
        EnvironmentServiceAbstraction,
        I18nServiceAbstraction,
        PlatformUtilsServiceAbstraction,
        StateServiceAbstraction,
        CryptoServiceAbstraction,
      ],
      multi: true,
    }),
    safeProvider({ provide: LogServiceAbstraction, useClass: ElectronLogService, deps: [] }),
    safeProvider({
      provide: I18nServiceAbstraction,
      useFactory: (window: Window) => new I18nService(window.navigator.language, "./locales"),
      deps: [WINDOW],
    }),
    safeProvider({
      provide: MessagingServiceAbstraction,
      useClass: ElectronRendererMessagingService,
      deps: [BroadcasterServiceAbstraction],
    }),
    safeProvider({
      provide: StorageServiceAbstraction,
      useClass: ElectronRendererStorageService,
      deps: [],
    }),
    safeProvider({
      provide: SECURE_STORAGE,
      useClass: ElectronRendererSecureStorageService,
      deps: [],
    }),
    safeProvider({
      provide: PlatformUtilsServiceAbstraction,
      useFactory: (
        i18nService: I18nServiceAbstraction,
        messagingService: MessagingServiceAbstraction,
        stateService: StateServiceAbstraction,
      ) => new ElectronPlatformUtilsService(i18nService, messagingService, false, stateService),
      deps: [I18nServiceAbstraction, MessagingServiceAbstraction, StateServiceAbstraction],
    }),
    safeProvider({
      provide: CryptoFunctionServiceAbstraction,
      useClass: NodeCryptoFunctionService,
      deps: [],
    }),
    safeProvider({
      provide: ApiServiceAbstraction,
      useFactory: (
        tokenService: TokenServiceAbstraction,
        platformUtilsService: PlatformUtilsServiceAbstraction,
        environmentService: EnvironmentServiceAbstraction,
        messagingService: MessagingServiceAbstraction,
        appIdService: AppIdServiceAbstraction,
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
            ")",
        ),
      deps: [
        TokenServiceAbstraction,
        PlatformUtilsServiceAbstraction,
        EnvironmentServiceAbstraction,
        MessagingServiceAbstraction,
        AppIdServiceAbstraction,
      ],
    }),
    safeProvider({
      provide: AuthServiceAbstraction,
      useClass: AuthService,
      deps: [
        ApiServiceAbstraction,
        AppIdServiceAbstraction,
        PlatformUtilsServiceAbstraction,
        MessagingServiceAbstraction,
        StateServiceAbstraction,
      ],
    }),
    safeProvider({
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
        BatchingServiceAbstraction,
      ],
    }),
    safeProvider(AuthGuardService),
    safeProvider(LaunchGuardService),
    safeProvider({
      provide: StateMigrationServiceAbstraction,
      useFactory: (
        storageService: StorageServiceAbstraction,
        secureStorageService: StorageServiceAbstraction,
      ) =>
        new StateMigrationService(
          storageService,
          secureStorageService,
          new StateFactory(GlobalState, Account),
        ),
      deps: [StorageServiceAbstraction, SECURE_STORAGE],
    }),
    safeProvider({
      provide: StateServiceAbstraction,
      useFactory: (
        storageService: StorageServiceAbstraction,
        secureStorageService: StorageServiceAbstraction,
        logService: LogServiceAbstraction,
        stateMigrationService: StateMigrationServiceAbstraction,
      ) =>
        new StateService(
          storageService,
          secureStorageService,
          logService,
          stateMigrationService,
          true,
          new StateFactory(GlobalState, Account),
        ),
      deps: [
        StorageServiceAbstraction,
        SECURE_STORAGE,
        LogServiceAbstraction,
        StateMigrationServiceAbstraction,
      ],
    }),
  ] satisfies SafeProvider[],
})
export class ServicesModule {}
