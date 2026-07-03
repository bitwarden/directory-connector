import {
  APP_INITIALIZER,
  ApplicationRef,
  ComponentFactoryResolver,
  EnvironmentProviders,
  Injector,
  Provider,
} from "@angular/core";

import { ApiService as ApiServiceAbstraction } from "@/libs/abstractions/api.service";
import { AppIdService as AppIdServiceAbstraction } from "@/libs/abstractions/appId.service";
import { AuthService as AuthServiceAbstraction } from "@/libs/abstractions/auth.service";
import { BroadcasterService as BroadcasterServiceAbstraction } from "@/libs/abstractions/broadcaster.service";
import { CryptoFunctionService as CryptoFunctionServiceAbstraction } from "@/libs/abstractions/cryptoFunction.service";
import { DirectoryFactoryService } from "@/libs/abstractions/directory-factory.service";
import { EnvironmentService as EnvironmentServiceAbstraction } from "@/libs/abstractions/environment.service";
import { I18nService as I18nServiceAbstraction } from "@/libs/abstractions/i18n.service";
import { LogService as LogServiceAbstraction } from "@/libs/abstractions/log.service";
import { MessagingService as MessagingServiceAbstraction } from "@/libs/abstractions/messaging.service";
import { PlatformUtilsService as PlatformUtilsServiceAbstraction } from "@/libs/abstractions/platformUtils.service";
import { StorageService as StorageServiceAbstraction } from "@/libs/abstractions/storage.service";
import { TokenService as TokenServiceAbstraction } from "@/libs/abstractions/token.service";
import { APPLICATION_NAME } from "@/libs/constants";
import { AppIdService } from "@/libs/services/appId.service";
import { AuthService } from "@/libs/services/auth.service";
import { BatchRequestBuilder } from "@/libs/services/batch-request-builder";
import { DefaultDirectoryFactoryService } from "@/libs/services/directory-factory.service";
import { DefaultEnvironmentService as EnvironmentServiceImplementation } from "@/libs/services/environment/environment.service";
import { I18nService } from "@/libs/services/i18n.service";
import { NativeSecureStorageService } from "@/libs/services/nativeSecureStorage.service";
import { NodeApiService } from "@/libs/services/nodeApi.service";
import { NodeCryptoFunctionService } from "@/libs/services/nodeCryptoFunction.service";
import { SingleRequestBuilder } from "@/libs/services/single-request-builder";
import {
  DefaultStateService,
  StateService,
} from "@/libs/services/state-service/default-state.service";
import { StateMigrationService } from "@/libs/services/state-service/stateMigration.service";
import { SyncService } from "@/libs/services/sync.service";
import { TokenService as TokenServiceImplementation } from "@/libs/services/token/token.service";

import { BroadcasterService as BroadcasterServiceImplementation } from "@/src-gui/angular/services/broadcaster.service";
import { ModalService } from "@/src-gui/angular/services/modal.service";
import { ValidationService } from "@/src-gui/angular/services/validation.service";
import { ElectronLogService } from "@/src-gui/services/electron/electronLog.service";
import { ElectronPlatformUtilsService } from "@/src-gui/services/electron/electronPlatformUtils.service";
import { ElectronRendererMessagingService } from "@/src-gui/services/electron/electronRendererMessaging.service";
import { ElectronRendererStorageService } from "@/src-gui/services/electron/electronRendererStorage.service";

import { AuthGuardService } from "./auth-guard.service";
import { SafeInjectionToken, SECURE_STORAGE, WINDOW } from "./injection-tokens";
import { LaunchGuardService } from "./launch-guard.service";
import { SafeProvider, safeProvider } from "./safe-provider";

export function initFactory(injector: Injector): () => Promise<void> {
  return async () => {
    const stateService = injector.get(StateService);
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

export const servicesProviders: (Provider | EnvironmentProviders)[] = [
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
    useFactory: (logService: LogServiceAbstraction) =>
      new NativeSecureStorageService(APPLICATION_NAME, logService),
    deps: [LogServiceAbstraction],
  }),
  safeProvider({
    provide: PlatformUtilsServiceAbstraction,
    useFactory: (
      i18nService: I18nServiceAbstraction,
      messagingService: MessagingServiceAbstraction,
    ) => new ElectronPlatformUtilsService(i18nService, messagingService, false),
    deps: [I18nServiceAbstraction, MessagingServiceAbstraction],
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
      StateService,
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
      StateService,
      BatchRequestBuilder,
      SingleRequestBuilder,
      DirectoryFactoryService,
    ],
  }),
  safeProvider(AuthGuardService),
  safeProvider(LaunchGuardService),
  safeProvider({
    provide: StateMigrationService,
    useClass: StateMigrationService,
    deps: [StorageServiceAbstraction, SECURE_STORAGE],
  }),
  safeProvider({
    provide: StateService,
    useFactory: (
      storageService: StorageServiceAbstraction,
      secureStorageService: StorageServiceAbstraction,
      logService: LogServiceAbstraction,
      stateMigrationService: StateMigrationService,
    ) =>
      new DefaultStateService(
        storageService,
        secureStorageService,
        logService,
        stateMigrationService,
        true,
      ),
    deps: [StorageServiceAbstraction, SECURE_STORAGE, LogServiceAbstraction, StateMigrationService],
  }),
  safeProvider({
    provide: TokenServiceAbstraction,
    useClass: TokenServiceImplementation,
    deps: [SECURE_STORAGE],
  }),
  safeProvider({
    provide: EnvironmentServiceAbstraction,
    useClass: EnvironmentServiceImplementation,
    deps: [StateService],
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
    deps: [LogServiceAbstraction, I18nServiceAbstraction, StateService],
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
] satisfies SafeProvider[];
