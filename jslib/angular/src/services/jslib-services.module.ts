import { LOCALE_ID, NgModule } from "@angular/core";

import { ApiService as ApiServiceAbstraction } from "@/jslib/common/src/abstractions/api.service";
import { AppIdService as AppIdServiceAbstraction } from "@/jslib/common/src/abstractions/appId.service";
import { AuthService as AuthServiceAbstraction } from "@/jslib/common/src/abstractions/auth.service";
import { BroadcasterService as BroadcasterServiceAbstraction } from "@/jslib/common/src/abstractions/broadcaster.service";
import { CryptoService as CryptoServiceAbstraction } from "@/jslib/common/src/abstractions/crypto.service";
import { CryptoFunctionService as CryptoFunctionServiceAbstraction } from "@/jslib/common/src/abstractions/cryptoFunction.service";
import { EnvironmentService as EnvironmentServiceAbstraction } from "@/jslib/common/src/abstractions/environment.service";
import { EventService as EventServiceAbstraction } from "@/jslib/common/src/abstractions/event.service";
import { FileUploadService as FileUploadServiceAbstraction } from "@/jslib/common/src/abstractions/fileUpload.service";
import { I18nService as I18nServiceAbstraction } from "@/jslib/common/src/abstractions/i18n.service";
import { KeyConnectorService as KeyConnectorServiceAbstraction } from "@/jslib/common/src/abstractions/keyConnector.service";
import { LogService } from "@/jslib/common/src/abstractions/log.service";
import { MessagingService as MessagingServiceAbstraction } from "@/jslib/common/src/abstractions/messaging.service";
import { NotificationsService as NotificationsServiceAbstraction } from "@/jslib/common/src/abstractions/notifications.service";
import { OrganizationService as OrganizationServiceAbstraction } from "@/jslib/common/src/abstractions/organization.service";
import { PasswordGenerationService as PasswordGenerationServiceAbstraction } from "@/jslib/common/src/abstractions/passwordGeneration.service";
import { PasswordRepromptService as PasswordRepromptServiceAbstraction } from "@/jslib/common/src/abstractions/passwordReprompt.service";
import { PlatformUtilsService as PlatformUtilsServiceAbstraction } from "@/jslib/common/src/abstractions/platformUtils.service";
import { PolicyService as PolicyServiceAbstraction } from "@/jslib/common/src/abstractions/policy.service";
import { ProviderService as ProviderServiceAbstraction } from "@/jslib/common/src/abstractions/provider.service";
import { SearchService as SearchServiceAbstraction } from "@/jslib/common/src/abstractions/search.service";
import { SettingsService as SettingsServiceAbstraction } from "@/jslib/common/src/abstractions/settings.service";
import { StateService as StateServiceAbstraction } from "@/jslib/common/src/abstractions/state.service";
import { StateMigrationService as StateMigrationServiceAbstraction } from "@/jslib/common/src/abstractions/stateMigration.service";
import { StorageService as StorageServiceAbstraction } from "@/jslib/common/src/abstractions/storage.service";
import { SyncService as SyncServiceAbstraction } from "@/jslib/common/src/abstractions/sync.service";
import { TokenService as TokenServiceAbstraction } from "@/jslib/common/src/abstractions/token.service";
import { TwoFactorService as TwoFactorServiceAbstraction } from "@/jslib/common/src/abstractions/twoFactor.service";
import { UserVerificationService as UserVerificationServiceAbstraction } from "@/jslib/common/src/abstractions/userVerification.service";
import { VaultTimeoutService as VaultTimeoutServiceAbstraction } from "@/jslib/common/src/abstractions/vaultTimeout.service";
import { StateFactory } from "@/jslib/common/src/factories/stateFactory";
import { Account } from "@/jslib/common/src/models/domain/account";
import { GlobalState } from "@/jslib/common/src/models/domain/globalState";
import { ApiService } from "@/jslib/common/src/services/api.service";
import { AppIdService } from "@/jslib/common/src/services/appId.service";
import { AuthService } from "@/jslib/common/src/services/auth.service";
import { ConsoleLogService } from "@/jslib/common/src/services/consoleLog.service";
import { CryptoService } from "@/jslib/common/src/services/crypto.service";
import { EnvironmentService } from "@/jslib/common/src/services/environment.service";
import { EventService } from "@/jslib/common/src/services/event.service";
import { FileUploadService } from "@/jslib/common/src/services/fileUpload.service";
import { KeyConnectorService } from "@/jslib/common/src/services/keyConnector.service";
import { NotificationsService } from "@/jslib/common/src/services/notifications.service";
import { OrganizationService } from "@/jslib/common/src/services/organization.service";
import { PasswordGenerationService } from "@/jslib/common/src/services/passwordGeneration.service";
import { PolicyService } from "@/jslib/common/src/services/policy.service";
import { ProviderService } from "@/jslib/common/src/services/provider.service";
import { SearchService } from "@/jslib/common/src/services/search.service";
import { SettingsService } from "@/jslib/common/src/services/settings.service";
import { StateService } from "@/jslib/common/src/services/state.service";
import { StateMigrationService } from "@/jslib/common/src/services/stateMigration.service";
import { SyncService } from "@/jslib/common/src/services/sync.service";
import { TokenService } from "@/jslib/common/src/services/token.service";
import { TwoFactorService } from "@/jslib/common/src/services/twoFactor.service";
import { UserVerificationService } from "@/jslib/common/src/services/userVerification.service";
import { VaultTimeoutService } from "@/jslib/common/src/services/vaultTimeout.service";

import { AuthGuardService } from "./auth-guard.service";
import { BroadcasterService } from "./broadcaster.service";
import { LockGuardService } from "./lock-guard.service";
import { ModalService } from "./modal.service";
import { PasswordRepromptService } from "./passwordReprompt.service";
import { UnauthGuardService } from "./unauth-guard.service";
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
    AuthGuardService,
    UnauthGuardService,
    LockGuardService,
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
    {
      provide: FileUploadServiceAbstraction,
      useClass: FileUploadService,
      deps: [LogService, ApiServiceAbstraction],
    },
    {
      provide: SyncServiceAbstraction,
      useFactory: (
        apiService: ApiServiceAbstraction,
        settingsService: SettingsServiceAbstraction,
        cryptoService: CryptoServiceAbstraction,
        messagingService: MessagingServiceAbstraction,
        policyService: PolicyServiceAbstraction,
        logService: LogService,
        keyConnectorService: KeyConnectorServiceAbstraction,
        stateService: StateServiceAbstraction,
        organizationService: OrganizationServiceAbstraction,
        providerService: ProviderServiceAbstraction,
      ) =>
        new SyncService(
          apiService,
          settingsService,
          cryptoService,
          messagingService,
          policyService,
          logService,
          keyConnectorService,
          stateService,
          organizationService,
          providerService,
          async (expired: boolean) => messagingService.send("logout", { expired: expired }),
        ),
      deps: [
        ApiServiceAbstraction,
        SettingsServiceAbstraction,
        CryptoServiceAbstraction,
        MessagingServiceAbstraction,
        PolicyServiceAbstraction,
        LogService,
        KeyConnectorServiceAbstraction,
        StateServiceAbstraction,
        OrganizationServiceAbstraction,
        ProviderServiceAbstraction,
      ],
    },
    { provide: BroadcasterServiceAbstraction, useClass: BroadcasterService },
    {
      provide: SettingsServiceAbstraction,
      useClass: SettingsService,
      deps: [StateServiceAbstraction],
    },
    {
      provide: VaultTimeoutServiceAbstraction,
      useFactory: (
        cryptoService: CryptoServiceAbstraction,
        platformUtilsService: PlatformUtilsServiceAbstraction,
        messagingService: MessagingServiceAbstraction,
        searchService: SearchServiceAbstraction,
        tokenService: TokenServiceAbstraction,
        policyService: PolicyServiceAbstraction,
        keyConnectorService: KeyConnectorServiceAbstraction,
        stateService: StateServiceAbstraction,
      ) =>
        new VaultTimeoutService(
          cryptoService,
          platformUtilsService,
          messagingService,
          searchService,
          tokenService,
          policyService,
          keyConnectorService,
          stateService,
          null,
          async (userId?: string) =>
            messagingService.send("logout", { expired: false, userId: userId }),
        ),
      deps: [
        CryptoServiceAbstraction,
        PlatformUtilsServiceAbstraction,
        MessagingServiceAbstraction,
        SearchServiceAbstraction,
        TokenServiceAbstraction,
        PolicyServiceAbstraction,
        KeyConnectorServiceAbstraction,
        StateServiceAbstraction,
      ],
    },
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
      provide: SearchServiceAbstraction,
      useClass: SearchService,
      deps: [LogService, I18nServiceAbstraction],
    },
    {
      provide: NotificationsServiceAbstraction,
      useFactory: (
        syncService: SyncServiceAbstraction,
        appIdService: AppIdServiceAbstraction,
        apiService: ApiServiceAbstraction,
        vaultTimeoutService: VaultTimeoutServiceAbstraction,
        environmentService: EnvironmentServiceAbstraction,
        messagingService: MessagingServiceAbstraction,
        logService: LogService,
        stateService: StateServiceAbstraction,
      ) =>
        new NotificationsService(
          syncService,
          appIdService,
          apiService,
          vaultTimeoutService,
          environmentService,
          async () => messagingService.send("logout", { expired: true }),
          logService,
          stateService,
        ),
      deps: [
        SyncServiceAbstraction,
        AppIdServiceAbstraction,
        ApiServiceAbstraction,
        VaultTimeoutServiceAbstraction,
        EnvironmentServiceAbstraction,
        MessagingServiceAbstraction,
        LogService,
        StateServiceAbstraction,
      ],
    },
    {
      provide: EventServiceAbstraction,
      useClass: EventService,
      deps: [
        ApiServiceAbstraction,
        StateServiceAbstraction,
        LogService,
        OrganizationServiceAbstraction,
      ],
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
      provide: UserVerificationServiceAbstraction,
      useClass: UserVerificationService,
      deps: [CryptoServiceAbstraction, I18nServiceAbstraction, ApiServiceAbstraction],
    },
    { provide: PasswordRepromptServiceAbstraction, useClass: PasswordRepromptService },
    {
      provide: OrganizationServiceAbstraction,
      useClass: OrganizationService,
      deps: [StateServiceAbstraction],
    },
    {
      provide: ProviderServiceAbstraction,
      useClass: ProviderService,
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
