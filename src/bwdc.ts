import * as fs from 'fs';
import * as path from 'path';

import { LogLevelType } from 'jslib-common/enums/logLevelType';

import { AuthService } from './services/auth.service';

import { ConfigurationService } from './services/configuration.service';
import { I18nService } from './services/i18n.service';
import { KeytarSecureStorageService } from './services/keytarSecureStorage.service';
import { LowdbStorageService } from './services/lowdbStorage.service';
import { NodeApiService } from './services/nodeApi.service';
import { SyncService } from './services/sync.service';

import { CliPlatformUtilsService } from 'jslib-node/cli/services/cliPlatformUtils.service';
import { ConsoleLogService } from 'jslib-node/cli/services/consoleLog.service';
import { NodeCryptoFunctionService } from 'jslib-node/services/nodeCryptoFunction.service';

import { AccountsManagementService } from 'jslib-common/services/accountsManagement.service';
import { ActiveAccountService } from 'jslib-common/services/activeAccount.service';
import { AppIdService } from 'jslib-common/services/appId.service';
import { ContainerService } from 'jslib-common/services/container.service';
import { CryptoService } from 'jslib-common/services/crypto.service';
import { EnvironmentService } from 'jslib-common/services/environment.service';
import { NoopMessagingService } from 'jslib-common/services/noopMessaging.service';
import { OrganizationService } from 'jslib-common/services/organization.service';
import { PasswordGenerationService } from 'jslib-common/services/passwordGeneration.service';
import { PolicyService } from 'jslib-common/services/policy.service';
import { ProviderService } from 'jslib-common/services/provider.service';
import { StoreService } from 'jslib-common/services/store.service';
import { TokenService } from 'jslib-common/services/token.service';

import { StorageService as StorageServiceAbstraction } from 'jslib-common/abstractions/storage.service';

import { Program } from './program';
import { refreshToken } from './services/api.service';
import { StorageKey } from 'jslib-common/enums/storageKey';

// tslint:disable-next-line
const packageJson = require('./package.json');

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
    configurationService: ConfigurationService;
    syncService: SyncService;
    passwordGenerationService: PasswordGenerationService;
    program: Program;
    activeAccount: ActiveAccountService;
    accountsManagementService: AccountsManagementService;
    organizationService: OrganizationService;
    providerService: ProviderService;
    storeService: StoreService;
    policyService: PolicyService

    constructor() {
        const applicationName = 'Bitwarden Directory Connector';
        if (process.env.BITWARDENCLI_CONNECTOR_APPDATA_DIR) {
            this.dataFilePath = path.resolve(process.env.BITWARDENCLI_CONNECTOR_APPDATA_DIR);
        } else if (process.env.BITWARDEN_CONNECTOR_APPDATA_DIR) {
            this.dataFilePath = path.resolve(process.env.BITWARDEN_CONNECTOR_APPDATA_DIR);
        } else if (fs.existsSync(path.join(__dirname, 'bitwarden-connector-appdata'))) {
            this.dataFilePath = path.join(__dirname, 'bitwarden-connector-appdata');
        } else if (process.platform === 'darwin') {
            this.dataFilePath = path.join(process.env.HOME, 'Library/Application Support/' + applicationName);
        } else if (process.platform === 'win32') {
            this.dataFilePath = path.join(process.env.APPDATA, applicationName);
        } else if (process.env.XDG_CONFIG_HOME) {
            this.dataFilePath = path.join(process.env.XDG_CONFIG_HOME, applicationName);
        } else {
            this.dataFilePath = path.join(process.env.HOME, '.config/' + applicationName);
        }

        const plaintextSecrets = process.env.BITWARDENCLI_CONNECTOR_PLAINTEXT_SECRETS === 'true';
        this.i18nService = new I18nService('en', './locales');
        this.platformUtilsService = new CliPlatformUtilsService('connector', packageJson);
        this.logService = new ConsoleLogService(this.platformUtilsService.isDev(),
            level => process.env.BITWARDENCLI_CONNECTOR_DEBUG !== 'true' && level <= LogLevelType.Info);
        this.cryptoFunctionService = new NodeCryptoFunctionService();
        this.storageService = new LowdbStorageService(this.logService, null, this.dataFilePath, false, true);
        this.secureStorageService = plaintextSecrets ?
            this.storageService : new KeytarSecureStorageService(applicationName);
        this.storeService = new StoreService(this.storageService, this.secureStorageService);
        this.accountsManagementService = new AccountsManagementService(this.storageService, this.secureStorageService);
        this.activeAccount = new ActiveAccountService(this.accountsManagementService, this.storeService);
        this.organizationService = new OrganizationService(this.activeAccount);
        this.providerService = new ProviderService(this.activeAccount);
        this.cryptoService = new CryptoService(this.cryptoFunctionService, this.platformUtilsService,
            this.logService, this.activeAccount);
        this.appIdService = new AppIdService(this.storageService);
        this.tokenService = new TokenService(this.activeAccount);
        this.messagingService = new NoopMessagingService();
        this.environmentService = new EnvironmentService(this.activeAccount);
        this.apiService = new NodeApiService(this.tokenService, this.platformUtilsService, this.environmentService,
            () => refreshToken(this.activeAccount, this.authService), async () => await this.logout(),
            'Bitwarden_DC/' + this.platformUtilsService.getApplicationVersion() +
            ' (' + this.platformUtilsService.getDeviceString().toUpperCase() + ')', (clientId, clientSecret) =>
            this.authService.logInApiKey(clientId, clientSecret));
        this.containerService = new ContainerService(this.cryptoService);
        this.authService = new AuthService(this.cryptoService, this.apiService, this.tokenService,
            this.appIdService, this.i18nService, this.platformUtilsService, this.messagingService, null,
            this.logService, this.accountsManagementService, this.activeAccount, false);
        this.configurationService = new ConfigurationService(this.storageService, this.secureStorageService,
            process.env.BITWARDENCLI_CONNECTOR_PLAINTEXT_SECRETS !== 'true');
        this.syncService = new SyncService(this.configurationService, this.logService, this.cryptoFunctionService,
            this.apiService, this.messagingService, this.i18nService, this.environmentService);
        this.policyService = new PolicyService(this.activeAccount, this.organizationService, this.apiService);
        this.passwordGenerationService = new PasswordGenerationService(this.cryptoService, this.policyService,
            this.activeAccount);
        this.program = new Program(this);
    }

    async run() {
        await this.init();
        this.program.run();
    }

    async logout() {
        await this.tokenService.clearToken();
        await this.accountsManagementService.remove(this.activeAccount.userId);
    }

    private async init() {
        await this.storageService.init();
        this.containerService.attachToWindow(global);
        await this.environmentService.setUrlsFromStorage();
        // Dev Server URLs. Comment out the line above.
        // this.apiService.setUrls({
        //     base: null,
        //     api: 'http://localhost:4000',
        //     identity: 'http://localhost:33656',
        // });
        const locale = await this.activeAccount.getInformation<string>(StorageKey.Locale);
        await this.i18nService.init(locale);
        this.authService.init();

        const installedVersion = await this.storageService.get<string>(StorageKey.InstalledVersion);
        const currentVersion = await this.platformUtilsService.getApplicationVersion();
        if (installedVersion == null || installedVersion !== currentVersion) {
            await this.storageService.save(StorageKey.InstalledVersion, currentVersion);
        }
    }
}

const main = new Main();
main.run();
