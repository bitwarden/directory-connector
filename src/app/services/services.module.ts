import {
  APP_INITIALIZER,
  ApplicationRef,
  ComponentFactoryResolver,
  Injector,
  NgModule,
} from "@angular/core";

import { BroadcasterService as BroadcasterServiceImplementation } from "@/jslib/angular/src/services/broadcaster.service";
import { ModalService } from "@/jslib/angular/src/services/modal.service";
import { ValidationService } from "@/jslib/angular/src/services/validation.service";
import { ApiService as ApiServiceAbstraction } from "@/jslib/common/src/abstractions/api.service";
import { AppIdService as AppIdServiceAbstraction } from "@/jslib/common/src/abstractions/appId.service";
import { BroadcasterService as BroadcasterServiceAbstraction } from "@/jslib/common/src/abstractions/broadcaster.service";
import { CryptoFunctionService as CryptoFunctionServiceAbstraction } from "@/jslib/common/src/abstractions/cryptoFunction.service";
import { I18nService as I18nServiceAbstraction } from "@/jslib/common/src/abstractions/i18n.service";
import { LogService as LogServiceAbstraction } from "@/jslib/common/src/abstractions/log.service";
import { MessagingService as MessagingServiceAbstraction } from "@/jslib/common/src/abstractions/messaging.service";
import { PlatformUtilsService as PlatformUtilsServiceAbstraction } from "@/jslib/common/src/abstractions/platformUtils.service";
import { StorageService as StorageServiceAbstraction } from "@/jslib/common/src/abstractions/storage.service";
import { AppIdService } from "@/jslib/common/src/services/appId.service";
import { ElectronLogService } from "@/jslib/electron/src/services/electronLog.service";
import { ElectronPlatformUtilsService } from "@/jslib/electron/src/services/electronPlatformUtils.service";
import { ElectronRendererMessagingService } from "@/jslib/electron/src/services/electronRendererMessaging.service";
import { ElectronRendererSecureStorageService } from "@/jslib/electron/src/services/electronRendererSecureStorage.service";
import { ElectronRendererStorageService } from "@/jslib/electron/src/services/electronRendererStorage.service";
import { NodeApiService } from "@/jslib/node/src/services/nodeApi.service";
import { NodeCryptoFunctionService } from "@/jslib/node/src/services/nodeCryptoFunction.service";

import { DirectoryFactoryService } from "@/src/abstractions/directory-factory.service";
import { EnvironmentService as EnvironmentServiceAbstraction } from "@/src/abstractions/environment.service";
import { TokenService as TokenServiceAbstraction } from "@/src/abstractions/token.service";
import { BatchRequestBuilder } from "@/src/services/batch-request-builder";
import { DefaultDirectoryFactoryService } from "@/src/services/directory-factory.service";
import { SingleRequestBuilder } from "@/src/services/single-request-builder";
import { StateMigrationService } from "@/src/services/state-service/stateMigration.service";

import { AuthService as AuthServiceAbstraction } from "../../abstractions/auth.service";
import { StateService as StateServiceAbstraction } from "../../abstractions/state.service";
import { AuthService } from "../../services/auth.service";
import { EnvironmentService as EnvironmentServiceImplementation } from "../../services/environment/environment.service";
import { I18nService } from "../../services/i18n.service";
import { StateServiceImplementation } from "../../services/state-service/state.service";
import { SyncService } from "../../services/sync.service";
import { TokenService as TokenServiceImplementation } from "../../services/token/token.service";

import { AuthGuardService } from "./auth-guard.service";
import { SafeInjectionToken, SECURE_STORAGE, WINDOW } from "./injection-tokens";
import { LaunchGuardService } from "./launch-guard.service";
import { SafeProvider, safeProvider } from "./safe-provider";

export function initFactory(injector: Injector): () => Promise<void> {
  return async () => {
    const stateService = injector.get(StateServiceAbstraction);
    const i18nService = injector.get(I18nServiceAbstraction);
    const platformUtilsService = injector.get(PlatformUtilsServiceAbstraction);
    const environmentService = injector.get(EnvironmentServiceAbstraction);

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
  };
}

@NgModule({
  imports: [],
  declarations: [],
  providers: [
    safeProvider({
      provide: APP_INITIALIZER as SafeInjectionToken<() => void>,
      useFactory: initFactory,
      deps: [Injector],
      multi: true,
    }),
    safeProvider({
      provide: WINDOW,
      useValue: window,
    }),
    safeProvider({ provide: LogServiceAbstraction, useClass: ElectronLogService, deps: [] }),
    safeProvider({
      provide: I18nServiceAbstraction,
      useFactory: (window: Window) => new I18nService(window.navigator.language, "./locales"),
      deps: [WINDOW],
    }),
    safeProvider({
      provide: BroadcasterServiceAbstraction,
      useClass: BroadcasterServiceImplementation,
      deps: [],
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
      provide: AppIdServiceAbstraction,
      useClass: AppIdService,
      deps: [StorageServiceAbstraction],
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
        CryptoFunctionServiceAbstraction,
        ApiServiceAbstraction,
        MessagingServiceAbstraction,
        I18nServiceAbstraction,
        StateServiceAbstraction,
        BatchRequestBuilder,
        SingleRequestBuilder,
        DirectoryFactoryService,
      ],
    }),
    safeProvider(AuthGuardService),
    safeProvider(LaunchGuardService),
    // Provide StateMigrationService
    safeProvider({
      provide: StateMigrationService,
      useFactory: (
        storageService: StorageServiceAbstraction,
        secureStorageService: StorageServiceAbstraction,
      ) => new StateMigrationService(storageService, secureStorageService),
      deps: [StorageServiceAbstraction, SECURE_STORAGE],
    }),
    // Use new StateService with flat key-value structure
    safeProvider({
      provide: StateServiceAbstraction,
      useFactory: (
        storageService: StorageServiceAbstraction,
        secureStorageService: StorageServiceAbstraction,
        logService: LogServiceAbstraction,
        stateMigrationService: StateMigrationService,
      ) =>
        new StateServiceImplementation(
          storageService,
          secureStorageService,
          logService,
          stateMigrationService,
          true,
        ),
      deps: [
        StorageServiceAbstraction,
        SECURE_STORAGE,
        LogServiceAbstraction,
        StateMigrationService,
      ],
    }),
    // Provide TokenService and EnvironmentService
    safeProvider({
      provide: TokenServiceAbstraction,
      useFactory: (secureStorage: StorageServiceAbstraction) =>
        new TokenServiceImplementation(secureStorage),
      deps: [SECURE_STORAGE],
    }),
    safeProvider({
      provide: EnvironmentServiceAbstraction,
      useFactory: (stateService: StateServiceAbstraction) =>
        new EnvironmentServiceImplementation(stateService),
      deps: [StateServiceAbstraction],
    }),
    safeProvider({
      provide: SingleRequestBuilder,
      deps: [],
    }),
    safeProvider({
      provide: BatchRequestBuilder,
      deps: [],
    }),
    safeProvider({
      provide: DirectoryFactoryService,
      useClass: DefaultDirectoryFactoryService,
      deps: [LogServiceAbstraction, I18nServiceAbstraction, StateServiceAbstraction],
    }),
    safeProvider({
      provide: ModalService,
      useClass: ModalService,
      deps: [ComponentFactoryResolver, ApplicationRef, Injector],
    }),
    safeProvider({
      provide: ValidationService,
      useClass: ValidationService,
      deps: [I18nServiceAbstraction, PlatformUtilsServiceAbstraction],
    }),
  ] satisfies SafeProvider[],
})
export class ServicesModule {}
