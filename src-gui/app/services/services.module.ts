import {
  APP_INITIALIZER,
  ApplicationRef,
  ComponentFactoryResolver,
  EnvironmentProviders,
  Injector,
  Provider,
} from "@angular/core";

import { BroadcasterService as BroadcasterServiceAbstraction } from "@/libs/abstractions/broadcaster.service";
import { EnvironmentService as EnvironmentServiceAbstraction } from "@/libs/abstractions/environment.service";
import { I18nService as I18nServiceAbstraction } from "@/libs/abstractions/i18n.service";
import { LogService as LogServiceAbstraction } from "@/libs/abstractions/log.service";
import { MessagingService as MessagingServiceAbstraction } from "@/libs/abstractions/messaging.service";
import { PlatformUtilsService as PlatformUtilsServiceAbstraction } from "@/libs/abstractions/platformUtils.service";
import { StorageService as StorageServiceAbstraction } from "@/libs/abstractions/storage.service";
import { APPLICATION_NAME } from "@/libs/constants";
import { DefaultEnvironmentService as EnvironmentServiceImplementation } from "@/libs/services/environment/environment.service";
import { I18nService } from "@/libs/services/i18n.service";
import { NativeSecureStorageService } from "@/libs/services/nativeSecureStorage.service";
import {
  DefaultStateService,
  StateService,
} from "@/libs/services/state-service/default-state.service";

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

    // If auth tokens exist but org config is missing (e.g. data.json was deleted),
    // clear tokens so the user is forced back to the login screen.
    const accessToken = await stateService.getAccessToken();
    const organizationId = await stateService.getOrganizationId();
    if (accessToken != null && organizationId == null) {
      await stateService.clearAuthTokens();
    }

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
    provide: EnvironmentServiceAbstraction,
    useClass: EnvironmentServiceImplementation,
    deps: [StateService],
  }),
  safeProvider({
    provide: StateService,
    useFactory: (
      storageService: StorageServiceAbstraction,
      secureStorageService: StorageServiceAbstraction,
      logService: LogServiceAbstraction,
    ) =>
      // TODO: Remove renderer-side StateService entirely — it proxies all reads/writes over
      // IPC to the main process and should be replaced with explicit IPC handlers per property.

      new DefaultStateService(
        storageService,
        secureStorageService,
        logService,
        {
          needsMigration: () => Promise.resolve(false),
          migrate: () => Promise.resolve(),
          stampVersion: () => Promise.resolve(),
        },
        true,
      ),
    deps: [StorageServiceAbstraction, SECURE_STORAGE, LogServiceAbstraction],
  }),
  safeProvider(AuthGuardService),
  safeProvider(LaunchGuardService),
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
