import * as fs from "fs";
import * as path from "path";

import { StorageService as StorageServiceAbstraction } from "jslib-common/abstractions/storage.service";
import { TwoFactorService as TwoFactorServiceAbstraction } from "jslib-common/abstractions/twoFactor.service";
import { ClientType } from "jslib-common/enums/clientType";
import { LogLevelType } from "jslib-common/enums/logLevelType";
import { StateFactory } from "jslib-common/factories/stateFactory";
import { GlobalState } from "jslib-common/models/domain/globalState";
import { ApiLogInCredentials } from "jslib-common/models/domain/logInCredentials";
import { AppIdService } from "jslib-common/services/appId.service";
import { CipherService } from "jslib-common/services/cipher.service";
import { CollectionService } from "jslib-common/services/collection.service";
import { ContainerService } from "jslib-common/services/container.service";
import { CryptoService } from "jslib-common/services/crypto.service";
import { EnvironmentService } from "jslib-common/services/environment.service";
import { FileUploadService } from "jslib-common/services/fileUpload.service";
import { FolderService } from "jslib-common/services/folder.service";
import { KeyConnectorService } from "jslib-common/services/keyConnector.service";
import { NoopMessagingService } from "jslib-common/services/noopMessaging.service";
import { OrganizationService } from "jslib-common/services/organization.service";
import { PasswordGenerationService } from "jslib-common/services/passwordGeneration.service";
import { PolicyService } from "jslib-common/services/policy.service";
import { ProviderService } from "jslib-common/services/provider.service";
import { SearchService } from "jslib-common/services/search.service";
import { SendService } from "jslib-common/services/send.service";
import { SettingsService } from "jslib-common/services/settings.service";
import { TokenService } from "jslib-common/services/token.service";
import { CliPlatformUtilsService } from "jslib-node/cli/services/cliPlatformUtils.service";
import { ConsoleLogService } from "jslib-node/cli/services/consoleLog.service";
import { NodeApiService } from "jslib-node/services/nodeApi.service";
import { NodeCryptoFunctionService } from "jslib-node/services/nodeCryptoFunction.service";

import { Account } from "./models/account";
import { Program } from "./program";
import { AuthService } from "./services/auth.service";
import { I18nService } from "./services/i18n.service";
import { KeytarSecureStorageService } from "./services/keytarSecureStorage.service";
import { LowdbStorageService } from "./services/lowdbStorage.service";
import { NoopTwoFactorService } from "./services/noop/noopTwoFactor.service";
import { StateService } from "./services/state.service";
import { StateMigrationService } from "./services/stateMigration.service";
import { SyncService } from "./services/sync.service";

// tslint:disable-next-line
const packageJson = require("./package.json");

export const searchService: SearchService = null;
export class Main {
  dataFilePath: string;
  logService: ConsoleLogService;
  messagingService: NoopMessagingService;
  storageService: LowdbStorageService;
  secureStorageService: StorageServiceAbstraction;
  i18nService: I18nService;
  platformUtilsService: CliPlatformUtilsService;
  cryptoService: CryptoService;
  tokenService: TokenService;
  appIdService: AppIdService;
  apiService: NodeApiService;
  environmentService: EnvironmentService;
  containerService: ContainerService;
  cryptoFunctionService: NodeCryptoFunctionService;
  authService: AuthService;
  collectionService: CollectionService;
  cipherService: CipherService;
  fileUploadService: FileUploadService;
  folderService: FolderService;
  searchService: SearchService;
  sendService: SendService;
  settingsService: SettingsService;
  syncService: SyncService;
  passwordGenerationService: PasswordGenerationService;
  policyService: PolicyService;
  keyConnectorService: KeyConnectorService;
  program: Program;
  stateService: StateService;
  stateMigrationService: StateMigrationService;
  organizationService: OrganizationService;
  providerService: ProviderService;
  twoFactorService: TwoFactorServiceAbstraction;

  constructor() {
    const applicationName = "Bitwarden Directory Connector";
    if (process.env.BITWARDENCLI_CONNECTOR_APPDATA_DIR) {
      this.dataFilePath = path.resolve(process.env.BITWARDENCLI_CONNECTOR_APPDATA_DIR);
    } else if (process.env.BITWARDEN_CONNECTOR_APPDATA_DIR) {
      this.dataFilePath = path.resolve(process.env.BITWARDEN_CONNECTOR_APPDATA_DIR);
    } else if (fs.existsSync(path.join(__dirname, "bitwarden-connector-appdata"))) {
      this.dataFilePath = path.join(__dirname, "bitwarden-connector-appdata");
    } else if (process.platform === "darwin") {
      this.dataFilePath = path.join(
        process.env.HOME,
        "Library/Application Support/" + applicationName
      );
    } else if (process.platform === "win32") {
      this.dataFilePath = path.join(process.env.APPDATA, applicationName);
    } else if (process.env.XDG_CONFIG_HOME) {
      this.dataFilePath = path.join(process.env.XDG_CONFIG_HOME, applicationName);
    } else {
      this.dataFilePath = path.join(process.env.HOME, ".config/" + applicationName);
    }

    const plaintextSecrets = process.env.BITWARDENCLI_CONNECTOR_PLAINTEXT_SECRETS === "true";
    this.i18nService = new I18nService("en", "./locales");
    this.platformUtilsService = new CliPlatformUtilsService(
      ClientType.DirectoryConnector,
      packageJson
    );
    this.logService = new ConsoleLogService(
      this.platformUtilsService.isDev(),
      (level) => process.env.BITWARDENCLI_CONNECTOR_DEBUG !== "true" && level <= LogLevelType.Info
    );
    this.cryptoFunctionService = new NodeCryptoFunctionService();
    this.storageService = new LowdbStorageService(
      this.logService,
      null,
      this.dataFilePath,
      false,
      true
    );
    this.secureStorageService = plaintextSecrets
      ? this.storageService
      : new KeytarSecureStorageService(applicationName);

    this.stateMigrationService = new StateMigrationService(
      this.storageService,
      this.secureStorageService,
      new StateFactory(GlobalState, Account)
    );

    this.stateService = new StateService(
      this.storageService,
      this.secureStorageService,
      this.logService,
      this.stateMigrationService,
      process.env.BITWARDENCLI_CONNECTOR_PLAINTEXT_SECRETS !== "true",
      new StateFactory(GlobalState, Account)
    );

    this.cryptoService = new CryptoService(
      this.cryptoFunctionService,
      this.platformUtilsService,
      this.logService,
      this.stateService
    );

    this.appIdService = new AppIdService(this.storageService);
    this.tokenService = new TokenService(this.stateService);
    this.messagingService = new NoopMessagingService();
    this.environmentService = new EnvironmentService(this.stateService);
    this.apiService = new NodeApiService(
      this.tokenService,
      this.platformUtilsService,
      this.environmentService,
      async (expired: boolean) => await this.logout(),
      "Bitwarden_DC/" +
        this.platformUtilsService.getApplicationVersion() +
        " (" +
        this.platformUtilsService.getDeviceString().toUpperCase() +
        ")",
      (clientId, clientSecret) =>
        this.authService.logIn(new ApiLogInCredentials(clientId, clientSecret))
    );
    this.containerService = new ContainerService(this.cryptoService);

    this.organizationService = new OrganizationService(this.stateService);

    this.keyConnectorService = new KeyConnectorService(
      this.stateService,
      this.cryptoService,
      this.apiService,
      this.tokenService,
      this.logService,
      this.organizationService,
      this.cryptoFunctionService
    );

    this.twoFactorService = new NoopTwoFactorService();

    this.authService = new AuthService(
      this.cryptoService,
      this.apiService,
      this.tokenService,
      this.appIdService,
      this.platformUtilsService,
      this.messagingService,
      this.logService,
      this.keyConnectorService,
      this.environmentService,
      this.stateService,
      this.twoFactorService,
      this.i18nService
    );

    this.syncService = new SyncService(
      this.logService,
      this.cryptoFunctionService,
      this.apiService,
      this.messagingService,
      this.i18nService,
      this.environmentService,
      this.stateService
    );

    this.policyService = new PolicyService(
      this.stateService,
      this.organizationService,
      this.apiService
    );

    this.passwordGenerationService = new PasswordGenerationService(
      this.cryptoService,
      this.policyService,
      this.stateService
    );

    this.settingsService = new SettingsService(this.stateService);

    this.fileUploadService = new FileUploadService(this.logService, this.apiService);

    this.cipherService = new CipherService(
      this.cryptoService,
      this.settingsService,
      this.apiService,
      this.fileUploadService,
      this.i18nService,
      () => searchService,
      this.logService,
      this.stateService
    );

    this.searchService = new SearchService(this.cipherService, this.logService, this.i18nService);

    this.folderService = new FolderService(
      this.cryptoService,
      this.apiService,
      this.i18nService,
      this.cipherService,
      this.stateService
    );

    this.collectionService = new CollectionService(
      this.cryptoService,
      this.i18nService,
      this.stateService
    );

    this.sendService = new SendService(
      this.cryptoService,
      this.apiService,
      this.fileUploadService,
      this.i18nService,
      this.cryptoFunctionService,
      this.stateService
    );

    this.providerService = new ProviderService(this.stateService);

    this.program = new Program(this);
  }

  async run() {
    await this.init();
    this.program.run();
  }

  async logout() {
    await this.tokenService.clearToken();
    await this.stateService.clean();
  }

  private async init() {
    await this.storageService.init();
    await this.stateService.init();
    this.containerService.attachToWindow(global);
    await this.environmentService.setUrlsFromStorage();
    // Dev Server URLs. Comment out the line above.
    // this.apiService.setUrls({
    //     base: null,
    //     api: 'http://localhost:4000',
    //     identity: 'http://localhost:33656',
    // });
    const locale = await this.stateService.getLocale();
    await this.i18nService.init(locale);

    const installedVersion = await this.stateService.getInstalledVersion();
    const currentVersion = await this.platformUtilsService.getApplicationVersion();
    if (installedVersion == null || installedVersion !== currentVersion) {
      await this.stateService.setInstalledVersion(currentVersion);
    }
  }
}

const main = new Main();
main.run();
