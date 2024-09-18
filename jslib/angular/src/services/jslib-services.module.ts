import { LOCALE_ID, NgModule } from "@angular/core";

import { ApiService as ApiServiceAbstraction } from "@/jslib/common/src/abstractions/api.service";
import { AppIdService as AppIdServiceAbstraction } from "@/jslib/common/src/abstractions/appId.service";
import { BroadcasterService as BroadcasterServiceAbstraction } from "@/jslib/common/src/abstractions/broadcaster.service";
import { CryptoService as CryptoServiceAbstraction } from "@/jslib/common/src/abstractions/crypto.service";
import { CryptoFunctionService as CryptoFunctionServiceAbstraction } from "@/jslib/common/src/abstractions/cryptoFunction.service";
import { EnvironmentService as EnvironmentServiceAbstraction } from "@/jslib/common/src/abstractions/environment.service";
import { I18nService as I18nServiceAbstraction } from "@/jslib/common/src/abstractions/i18n.service";
import { KeyConnectorService as KeyConnectorServiceAbstraction } from "@/jslib/common/src/abstractions/keyConnector.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";
import { MessagingService as MessagingServiceAbstraction } from "@/jslib/common/src/abstractions/messaging.service";
import { OrganizationService as OrganizationServiceAbstraction } from "@/jslib/common/src/abstractions/organization.service";
import { PlatformUtilsService as PlatformUtilsServiceAbstraction } from "@/jslib/common/src/abstractions/platformUtils.service";
import { StateService as StateServiceAbstraction } from "@/jslib/common/src/abstractions/state.service";
import { StateMigrationService as StateMigrationServiceAbstraction } from "@/jslib/common/src/abstractions/stateMigration.service";
import { StorageService as StorageServiceAbstraction } from "@/jslib/common/src/abstractions/storage.service";
import { TokenService as TokenServiceAbstraction } from "@/jslib/common/src/abstractions/token.service";
import { TwoFactorService as TwoFactorServiceAbstraction } from "@/jslib/common/src/abstractions/twoFactor.service";
import { StateFactory } from "@/jslib/common/src/factories/stateFactory";
import { Account } from "@/jslib/common/src/models/domain/account";
import { GlobalState } from "@/jslib/common/src/models/domain/globalState";
import { ApiService } from "@/jslib/common/src/services/api.service";
import { AppIdService } from "@/jslib/common/src/services/appId.service";
import { ConsoleLogService } from "@/jslib/common/src/services/consoleLog.service";
import { CryptoService } from "@/jslib/common/src/services/crypto.service";
import { EnvironmentService } from "@/jslib/common/src/services/environment.service";
import { KeyConnectorService } from "@/jslib/common/src/services/keyConnector.service";
import { OrganizationService } from "@/jslib/common/src/services/organization.service";
import { StateService } from "@/jslib/common/src/services/state.service";
import { StateMigrationService } from "@/jslib/common/src/services/stateMigration.service";
import { TokenService } from "@/jslib/common/src/services/token.service";
import { TwoFactorService } from "@/jslib/common/src/services/twoFactor.service";

import {
  SafeInjectionToken,
  SECURE_STORAGE,
  WINDOW,
} from "../../../../src/app/services/injection-tokens";
import { SafeProvider, safeProvider } from "../../../../src/app/services/safe-provider";

import { BroadcasterService } from "./broadcaster.service";
import { ModalService } from "./modal.service";
import { ValidationService } from "./validation.service";

@NgModule({
  declarations: [],
  providers: [
    safeProvider({ provide: WINDOW, useValue: window }),
    safeProvider({
      provide: LOCALE_ID as SafeInjectionToken<string>,
      useFactory: (i18nService: I18nServiceAbstraction) => i18nService.translationLocale,
      deps: [I18nServiceAbstraction],
    }),
    safeProvider(ValidationService),
    safeProvider(ModalService),
    safeProvider({
      provide: AppIdServiceAbstraction,
      useClass: AppIdService,
      deps: [StorageServiceAbstraction],
    }),
    safeProvider({ provide: LogService, useFactory: () => new ConsoleLogService(false), deps: [] }),
    safeProvider({
      provide: EnvironmentServiceAbstraction,
      useClass: EnvironmentService,
      deps: [StateServiceAbstraction],
    }),
    safeProvider({
      provide: TokenServiceAbstraction,
      useClass: TokenService,
      deps: [StateServiceAbstraction],
    }),
    safeProvider({
      provide: CryptoServiceAbstraction,
      useClass: CryptoService,
      deps: [
        CryptoFunctionServiceAbstraction,
        PlatformUtilsServiceAbstraction,
        LogService,
        StateServiceAbstraction,
      ],
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
        new ApiService(
          tokenService,
          platformUtilsService,
          environmentService,
          appIdService,
          async (expired: boolean) => messagingService.send("logout", { expired: expired }),
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
      provide: BroadcasterServiceAbstraction,
      useClass: BroadcasterService,
      useAngularDecorators: true,
    }),
    safeProvider({
      provide: StateServiceAbstraction,
      useFactory: (
        storageService: StorageServiceAbstraction,
        secureStorageService: StorageServiceAbstraction,
        logService: LogService,
        stateMigrationService: StateMigrationServiceAbstraction,
      ) =>
        new StateService(
          storageService,
          secureStorageService,
          logService,
          stateMigrationService,
          new StateFactory(GlobalState, Account),
        ),
      deps: [
        StorageServiceAbstraction,
        SECURE_STORAGE,
        LogService,
        StateMigrationServiceAbstraction,
      ],
    }),
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
      provide: KeyConnectorServiceAbstraction,
      useClass: KeyConnectorService,
      deps: [
        StateServiceAbstraction,
        CryptoServiceAbstraction,
        ApiServiceAbstraction,
        TokenServiceAbstraction,
        LogService,
        OrganizationServiceAbstraction,
        CryptoFunctionServiceAbstraction,
      ],
    }),
    safeProvider({
      provide: OrganizationServiceAbstraction,
      useClass: OrganizationService,
      deps: [StateServiceAbstraction],
    }),
    safeProvider({
      provide: TwoFactorServiceAbstraction,
      useClass: TwoFactorService,
      deps: [I18nServiceAbstraction, PlatformUtilsServiceAbstraction],
    }),
  ] satisfies SafeProvider[],
})
export class JslibServicesModule {}
