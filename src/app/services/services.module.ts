import { APP_INITIALIZER, InjectionToken, NgModule } from "@angular/core";

import {
  JslibServicesModule,
  SECURE_STORAGE,
  WINDOW,
  LOGOUT_CALLBACK,
  STATE_FACTORY,
  CLIENT_TYPE,
} from "jslib-angular/services/jslib-services.module";
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
import { ClientType } from "jslib-common/enums/clientType";
import { StateFactory } from "jslib-common/factories/stateFactory";
import { GlobalState } from "jslib-common/models/domain/globalState";
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
import { InitService } from "./init.service";
import { LaunchGuardService } from "./launch-guard.service";

const CUSTOM_USER_AGENT = new InjectionToken<string>("CUSTOM_USER_AGENT");
const STATE_SERVICE_USE_SECURE_STORAGE = new InjectionToken<boolean>(
  "STATE_SERVICE_USE_SECURE_STORAGE"
);

@NgModule({
  imports: [JslibServicesModule],
  declarations: [],
  providers: [
    InitService,
    AuthGuardService,
    LaunchGuardService,
    {
      provide: APP_INITIALIZER,
      useFactory: (initService: InitService) => initService.init(),
      deps: [InitService],
      multi: true,
    },
    {
      provide: STATE_FACTORY,
      useValue: new StateFactory(GlobalState, Account),
    },
    {
      provide: LOGOUT_CALLBACK,
      useFactory: (messagingService: MessagingServiceAbstraction) => async (expired: boolean) =>
        messagingService.send("logout", { expired: expired }),
    },
    {
      provide: CUSTOM_USER_AGENT,
      useFactory: (platformUtilsService: PlatformUtilsServiceAbstraction) =>
        "Bitwarden_DC/" +
        platformUtilsService.getApplicationVersion() +
        " (" +
        platformUtilsService.getDeviceString().toUpperCase() +
        ")",
      deps: [PlatformUtilsServiceAbstraction],
    },
    {
      provide: STATE_SERVICE_USE_SECURE_STORAGE,
      useValue: true,
    },
    {
      provide: CLIENT_TYPE,
      useValue: ClientType.DirectoryConnector,
    },
    { provide: LogServiceAbstraction, useClass: ElectronLogService, deps: [] },
    {
      provide: I18nServiceAbstraction,
      useFactory: (window: Window) => new I18nService(window.navigator.language, "./locales"),
      deps: [WINDOW],
    },
    {
      provide: MessagingServiceAbstraction,
      useClass: ElectronRendererMessagingService,
      deps: [BroadcasterServiceAbstraction],
    },
    { provide: StorageServiceAbstraction, useClass: ElectronRendererStorageService },
    { provide: SECURE_STORAGE, useClass: ElectronRendererSecureStorageService },
    {
      provide: PlatformUtilsServiceAbstraction,
      useClass: ElectronPlatformUtilsService,
      deps: [
        I18nServiceAbstraction,
        MessagingServiceAbstraction,
        CLIENT_TYPE,
        StateServiceAbstraction,
      ],
    },
    { provide: CryptoFunctionServiceAbstraction, useClass: NodeCryptoFunctionService, deps: [] },
    {
      provide: ApiServiceAbstraction,
      useClass: NodeApiService,
      deps: [
        TokenServiceAbstraction,
        PlatformUtilsServiceAbstraction,
        EnvironmentServiceAbstraction,
        AppIdServiceAbstraction,
        LOGOUT_CALLBACK,
        CUSTOM_USER_AGENT,
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
    {
      provide: StateMigrationServiceAbstraction,
      useClass: StateMigrationService,
      deps: [StorageServiceAbstraction, SECURE_STORAGE, STATE_FACTORY],
    },
    {
      provide: StateServiceAbstraction,
      useClass: StateService,
      deps: [
        StorageServiceAbstraction,
        SECURE_STORAGE,
        LogServiceAbstraction,
        StateMigrationServiceAbstraction,
        STATE_SERVICE_USE_SECURE_STORAGE,
        STATE_FACTORY,
      ],
    },
    {
      provide: TwoFactorServiceAbstraction,
      useClass: NoopTwoFactorService,
    },
  ],
})
export class ServicesModule {}
