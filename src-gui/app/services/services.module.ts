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
import { StateService as StateServiceAbstraction } from "@/libs/abstractions/state.service";
import { StorageService as StorageServiceAbstraction } from "@/libs/abstractions/storage.service";
import { StorageKeys } from "@/libs/models/state.model";
import { DefaultEnvironmentService as EnvironmentServiceImplementation } from "@/libs/services/environment/environment.service";

import { BroadcasterService as BroadcasterServiceImplementation } from "@/src-gui/angular/services/broadcaster.service";
import { ModalService } from "@/src-gui/angular/services/modal.service";
import { ValidationService } from "@/src-gui/angular/services/validation.service";
import { RendererAuthService } from "@/src-gui/services/electron/rendererAuth.service";
import { RendererI18nService } from "@/src-gui/services/electron/rendererI18n.service";
import { RendererLogService } from "@/src-gui/services/electron/rendererLog.service";
import { RendererMessagingService } from "@/src-gui/services/electron/rendererMessaging.service";
import { RendererPlatformUtilsService } from "@/src-gui/services/electron/rendererPlatformUtils.service";
import { RendererStateService } from "@/src-gui/services/electron/rendererState.service";
import { RendererStorageService } from "@/src-gui/services/electron/rendererStorage.service";
import { RendererSyncService } from "@/src-gui/services/electron/rendererSync.service";

import { AuthGuardService } from "./auth-guard.service";
import { SafeInjectionToken, WINDOW } from "./injection-tokens";
import { LaunchGuardService } from "./launch-guard.service";
import { SafeProvider, safeProvider } from "./safe-provider";

export function initFactory(injector: Injector): () => Promise<void> {
  return async () => {
    const storageService = injector.get(StorageServiceAbstraction);
    const i18nService = injector.get(I18nServiceAbstraction);
    const platformUtilsService = injector.get(PlatformUtilsServiceAbstraction);
    const environmentService = injector.get(EnvironmentServiceAbstraction);

    // State migration and the "tokens exist but config is gone" reset both live in the main
    // process (see Main.bootstrap), which runs them before this window is created. They touch
    // the OS credential store, which only the main process may write.

    await environmentService.setUrlsFromStorage();
    await (i18nService as RendererI18nService).init();
    const htmlEl = window.document.documentElement;
    htmlEl.classList.add("os_" + platformUtilsService.getDeviceString());
    htmlEl.classList.add("locale_" + i18nService.translationLocale);
    window.document.title = i18nService.t("bitwardenDirectoryConnector");

    const installedVersion = await storageService.get<string>(StorageKeys.installedVersion);
    const currentVersion = await platformUtilsService.getApplicationVersion();
    if (installedVersion !== currentVersion) {
      await storageService.save(StorageKeys.installedVersion, currentVersion);
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
  safeProvider({
    provide: LogServiceAbstraction,
    useFactory: () => new RendererLogService(ipc.process.isDev),
    deps: [],
  }),
  safeProvider({
    provide: I18nServiceAbstraction,
    useFactory: (window: Window) => new RendererI18nService(window.navigator.language, "./locales"),
    deps: [WINDOW],
  }),
  safeProvider({
    provide: BroadcasterServiceAbstraction,
    useClass: BroadcasterServiceImplementation,
    deps: [],
  }),
  safeProvider({
    provide: MessagingServiceAbstraction,
    useClass: RendererMessagingService,
    deps: [BroadcasterServiceAbstraction],
  }),
  safeProvider({
    provide: StorageServiceAbstraction,
    useClass: RendererStorageService,
    deps: [],
  }),
  safeProvider({
    provide: PlatformUtilsServiceAbstraction,
    useFactory: (
      i18nService: I18nServiceAbstraction,
      messagingService: MessagingServiceAbstraction,
    ) => new RendererPlatformUtilsService(i18nService, messagingService),
    deps: [I18nServiceAbstraction, MessagingServiceAbstraction],
  }),
  safeProvider({
    provide: RendererAuthService,
    useClass: RendererAuthService,
    deps: [],
  }),
  safeProvider({
    provide: RendererSyncService,
    useClass: RendererSyncService,
    deps: [],
  }),
  safeProvider({
    provide: EnvironmentServiceAbstraction,
    useFactory: (storageService: StorageServiceAbstraction) =>
      // DefaultEnvironmentService only reads and writes the environment URLs, which live in plain
      // (non-credential) storage, so it is backed by the storage bridge directly rather than by a
      // full renderer-side StateService.
      new EnvironmentServiceImplementation({
        getEnvironmentUrls: () => storageService.get(StorageKeys.environmentUrls),
        setEnvironmentUrls: (value) => storageService.save(StorageKeys.environmentUrls, value),
      } as StateServiceAbstraction),
    deps: [StorageServiceAbstraction],
  }),
  safeProvider({
    provide: RendererStateService,
    useClass: RendererStateService,
    deps: [StorageServiceAbstraction],
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
