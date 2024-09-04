import { LOCALE_ID, NgModule } from "@angular/core";

import { ApiService as ApiServiceAbstraction } from "@/jslib/common/src/abstractions/api.service";
import { AppIdService as AppIdServiceAbstraction } from "@/jslib/common/src/abstractions/appId.service";
import { AuthService as AuthServiceAbstraction } from "@/jslib/common/src/abstractions/auth.service";
import { BroadcasterService as BroadcasterServiceAbstraction } from "@/jslib/common/src/abstractions/broadcaster.service";
import { CryptoService as CryptoServiceAbstraction } from "@/jslib/common/src/abstractions/crypto.service";
import { CryptoFunctionService as CryptoFunctionServiceAbstraction } from "@/jslib/common/src/abstractions/cryptoFunction.service";
import { EnvironmentService as EnvironmentServiceAbstraction } from "@/jslib/common/src/abstractions/environment.service";
import { I18nService as I18nServiceAbstraction } from "@/jslib/common/src/abstractions/i18n.service";
import { KeyConnectorService as KeyConnectorServiceAbstraction } from "@/jslib/common/src/abstractions/keyConnector.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";
import { MessagingService as MessagingServiceAbstraction } from "@/jslib/common/src/abstractions/messaging.service";
import { OrganizationService as OrganizationServiceAbstraction } from "@/jslib/common/src/abstractions/organization.service";
import { PasswordGenerationService as PasswordGenerationServiceAbstraction } from "@/jslib/common/src/abstractions/passwordGeneration.service";
import { PlatformUtilsService as PlatformUtilsServiceAbstraction } from "@/jslib/common/src/abstractions/platformUtils.service";
import { PolicyService as PolicyServiceAbstraction } from "@/jslib/common/src/abstractions/policy.service";
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
import { AuthService } from "@/jslib/common/src/services/auth.service";
import { ConsoleLogService } from "@/jslib/common/src/services/consoleLog.service";
import { CryptoService } from "@/jslib/common/src/services/crypto.service";
import { EnvironmentService } from "@/jslib/common/src/services/environment.service";
import { KeyConnectorService } from "@/jslib/common/src/services/keyConnector.service";
import { OrganizationService } from "@/jslib/common/src/services/organization.service";
import { PasswordGenerationService } from "@/jslib/common/src/services/passwordGeneration.service";
import { PolicyService } from "@/jslib/common/src/services/policy.service";
import { StateService } from "@/jslib/common/src/services/state.service";
import { StateMigrationService } from "@/jslib/common/src/services/stateMigration.service";
import { TokenService } from "@/jslib/common/src/services/token.service";
import { TwoFactorService } from "@/jslib/common/src/services/twoFactor.service";

import { BroadcasterService } from "./broadcaster.service";
import { ModalService } from "./modal.service";
import { ValidationService } from "./validation.service";

@NgModule({
  declarations: [],
  providers: [
    { provide: "WINDOW", useValue: window },
    {
      provide: LOCALE_ID,
      useFactory: (i18nService: I18nServiceAbstraction) => i18nService.translationLocale,
      deps: [I18nServiceAbstraction],
    },
    ValidationService,
    ModalService,
    {
      provide: AppIdServiceAbstraction,
      useClass: AppIdService,
      deps: [StorageServiceAbstraction],
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
        LogService,
        KeyConnectorServiceAbstraction,
        EnvironmentServiceAbstraction,
        StateServiceAbstraction,
        TwoFactorServiceAbstraction,
        I18nServiceAbstraction,
      ],
    },
    { provide: LogService, useFactory: () => new ConsoleLogService(false) },
    {
      provide: EnvironmentServiceAbstraction,
      useClass: EnvironmentService,
      deps: [StateServiceAbstraction],
    },
    { provide: TokenServiceAbstraction, useClass: TokenService, deps: [StateServiceAbstraction] },
    {
      provide: CryptoServiceAbstraction,
      useClass: CryptoService,
      deps: [
        CryptoFunctionServiceAbstraction,
        PlatformUtilsServiceAbstraction,
        LogService,
        StateServiceAbstraction,
      ],
    },
    {
      provide: PasswordGenerationServiceAbstraction,
      useClass: PasswordGenerationService,
      deps: [CryptoServiceAbstraction, PolicyServiceAbstraction, StateServiceAbstraction],
    },
    {
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
    },
    { provide: BroadcasterServiceAbstraction, useClass: BroadcasterService },
    {
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
        "SECURE_STORAGE",
        LogService,
        StateMigrationServiceAbstraction,
      ],
    },
    {
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
      deps: [StorageServiceAbstraction, "SECURE_STORAGE"],
    },
    {
      provide: PolicyServiceAbstraction,
      useClass: PolicyService,
      deps: [StateServiceAbstraction, OrganizationServiceAbstraction, ApiServiceAbstraction],
    },
    {
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
    },
    {
      provide: OrganizationServiceAbstraction,
      useClass: OrganizationService,
      deps: [StateServiceAbstraction],
    },
    {
      provide: TwoFactorServiceAbstraction,
      useClass: TwoFactorService,
      deps: [I18nServiceAbstraction, PlatformUtilsServiceAbstraction],
    },
  ],
})
export class JslibServicesModule {}
