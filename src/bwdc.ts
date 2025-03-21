import * as fs from "fs";
import * as path from "path";

import { StorageService as StorageServiceAbstraction } from "@/jslib/common/src/abstractions/storage.service";
import { ClientType } from "@/jslib/common/src/enums/clientType";
import { LogLevelType } from "@/jslib/common/src/enums/logLevelType";
import { StateFactory } from "@/jslib/common/src/factories/stateFactory";
import { GlobalState } from "@/jslib/common/src/models/domain/globalState";
import { AppIdService } from "@/jslib/common/src/services/appId.service";
import { ContainerService } from "@/jslib/common/src/services/container.service";
import { CryptoService } from "@/jslib/common/src/services/crypto.service";
import { EnvironmentService } from "@/jslib/common/src/services/environment.service";
import { NoopMessagingService } from "@/jslib/common/src/services/noopMessaging.service";
import { TokenService } from "@/jslib/common/src/services/token.service";
import { CliPlatformUtilsService } from "@/jslib/node/src/cli/services/cliPlatformUtils.service";
import { ConsoleLogService } from "@/jslib/node/src/cli/services/consoleLog.service";
import { NodeApiService } from "@/jslib/node/src/services/nodeApi.service";
import { NodeCryptoFunctionService } from "@/jslib/node/src/services/nodeCryptoFunction.service";

import { DirectoryFactoryService } from "./abstractions/directory-factory.service";
import { Account } from "./models/account";
import { Program } from "./program";
import { AuthService } from "./services/auth.service";
import { BatchRequestBuilder } from "./services/batch-request-builder";
import { DefaultDirectoryFactoryService } from "./services/directory-factory.service";
import { I18nService } from "./services/i18n.service";
import { KeytarSecureStorageService } from "./services/keytarSecureStorage.service";
import { LowdbStorageService } from "./services/lowdbStorage.service";
import { SingleRequestBuilder } from "./services/single-request-builder";
import { StateService } from "./services/state.service";
import { StateMigrationService } from "./services/stateMigration.service";
import { SyncService } from "./services/sync.service";

// eslint-disable-next-line
const packageJson = require("../package.json");

export class Main {
  dataFilePath: string;
  logService: ConsoleLogService;
  program: Program;

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
      new StateFactory(GlobalState, Account),
    );

    this.stateService = new StateService(
      this.storageService,
      this.secureStorageService,
      this.logService,
      this.stateMigrationService,
      process.env.BITWARDENCLI_CONNECTOR_PLAINTEXT_SECRETS !== "true",
      new StateFactory(GlobalState, Account),
    );

    this.cryptoService = new CryptoService(
      this.cryptoFunctionService,
      this.platformUtilsService,
      this.logService,
      this.stateService,
    );

    this.appIdService = new AppIdService(this.storageService);
    this.tokenService = new TokenService(this.stateService);
    this.messagingService = new NoopMessagingService();
    this.environmentService = new EnvironmentService(this.stateService);

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
    this.containerService = new ContainerService(this.cryptoService);

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
      this.environmentService,
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
