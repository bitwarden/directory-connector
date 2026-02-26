import * as fs from "fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as path from "path";

import { DirectoryFactoryService } from "@/libs/abstractions/directory-factory.service";
import { EnvironmentService } from "@/libs/abstractions/environment.service";
import { StateService } from "@/libs/abstractions/state.service";
import { TokenService } from "@/libs/abstractions/token.service";
import { AuthService } from "@/libs/services/auth.service";
import { BatchRequestBuilder } from "@/libs/services/batch-request-builder";
import { DefaultDirectoryFactoryService } from "@/libs/services/directory-factory.service";
import { EnvironmentService as EnvironmentServiceImplementation } from "@/libs/services/environment/environment.service";
import { I18nService } from "@/libs/services/i18n.service";
import { KeytarSecureStorageService } from "@/libs/services/keytarSecureStorage.service";
import { LowdbStorageService } from "@/libs/services/lowdbStorage.service";
import { SingleRequestBuilder } from "@/libs/services/single-request-builder";
import { StateServiceImplementation } from "@/libs/services/state-service/state.service";
import { StateMigrationService } from "@/libs/services/state-service/stateMigration.service";
import { SyncService } from "@/libs/services/sync.service";
import { TokenService as TokenServiceImplementation } from "@/libs/services/token/token.service";

import { StorageService as StorageServiceAbstraction } from "@/jslib/common/src/abstractions/storage.service";
import { ClientType } from "@/jslib/common/src/enums/clientType";
import { LogLevelType } from "@/jslib/common/src/enums/logLevelType";
import { AppIdService } from "@/jslib/common/src/services/appId.service";
import { NoopMessagingService } from "@/jslib/common/src/services/noopMessaging.service";

import { CliPlatformUtilsService } from "@/src-cli/cli/services/cliPlatformUtils.service";
import { ConsoleLogService } from "@/src-cli/cli/services/consoleLog.service";
import { NodeApiService } from "@/src-cli/services/node/nodeApi.service";
import { NodeCryptoFunctionService } from "@/src-cli/services/node/nodeCryptoFunction.service";

import packageJson from "../package.json";

import { Program } from "./program";

// ESM __dirname polyfill for Node 20

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Main {
  dataFilePath: string;
  logService: ConsoleLogService;
  program: Program;

  messagingService: NoopMessagingService;
  storageService: LowdbStorageService;
  secureStorageService: StorageServiceAbstraction;
  i18nService: I18nService;
  platformUtilsService: CliPlatformUtilsService;
  tokenService: TokenService;
  appIdService: AppIdService;
  apiService: NodeApiService;
  environmentService: EnvironmentService;
  cryptoFunctionService: NodeCryptoFunctionService;
  authService: AuthService;
  syncService: SyncService;
  stateService: StateService;
  stateMigrationService: StateMigrationService;
  directoryFactoryService: DirectoryFactoryService;
  batchRequestBuilder: BatchRequestBuilder;
  singleRequestBuilder: SingleRequestBuilder;

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
        "Library/Application Support/" + applicationName,
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
      packageJson,
    );
    this.logService = new ConsoleLogService(
      this.platformUtilsService.isDev(),
      (level) => process.env.BITWARDENCLI_CONNECTOR_DEBUG !== "true" && level <= LogLevelType.Info,
    );
    this.cryptoFunctionService = new NodeCryptoFunctionService();
    this.storageService = new LowdbStorageService(
      this.logService,
      null,
      this.dataFilePath,
      false,
      true,
    );
    this.secureStorageService = plaintextSecrets
      ? this.storageService
      : new KeytarSecureStorageService(applicationName);

    this.stateMigrationService = new StateMigrationService(
      this.storageService,
      this.secureStorageService,
    );

    // Use new StateService with flat key-value structure
    this.stateService = new StateServiceImplementation(
      this.storageService,
      this.secureStorageService,
      this.logService,
      this.stateMigrationService,
      process.env.BITWARDENCLI_CONNECTOR_PLAINTEXT_SECRETS !== "true",
    );

    this.appIdService = new AppIdService(this.storageService);
    this.tokenService = new TokenServiceImplementation(this.secureStorageService);
    this.messagingService = new NoopMessagingService();
    this.environmentService = new EnvironmentServiceImplementation(this.stateService);

    const customUserAgent =
      "Bitwarden_DC/" +
      this.platformUtilsService.getApplicationVersion() +
      " (" +
      this.platformUtilsService.getDeviceString().toUpperCase() +
      ")";
    this.apiService = new NodeApiService(
      this.tokenService,
      this.platformUtilsService,
      this.environmentService,
      this.appIdService,
      async (expired: boolean) => await this.logout(),
      customUserAgent,
    );

    this.authService = new AuthService(
      this.apiService,
      this.appIdService,
      this.platformUtilsService,
      this.messagingService,
      this.stateService,
    );

    this.directoryFactoryService = new DefaultDirectoryFactoryService(
      this.logService,
      this.i18nService,
      this.stateService,
    );

    this.batchRequestBuilder = new BatchRequestBuilder();
    this.singleRequestBuilder = new SingleRequestBuilder();

    this.syncService = new SyncService(
      this.cryptoFunctionService,
      this.apiService,
      this.messagingService,
      this.i18nService,
      this.stateService,
      this.batchRequestBuilder,
      this.singleRequestBuilder,
      this.directoryFactoryService,
    );

    this.program = new Program(this);
  }

  async run() {
    await this.init();
    this.program.run();
  }

  async logout() {
    await this.stateService.clearAuthTokens();
    await this.stateService.clean();
  }

  private async init() {
    await this.storageService.init();
    await this.stateService.init();
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
