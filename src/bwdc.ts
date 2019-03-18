import * as fs from 'fs';
import * as path from 'path';

import { LogLevelType } from 'jslib/enums/logLevelType';

import { AuthService } from 'jslib/services/auth.service';

import { ConfigurationService } from './services/configuration.service';
import { I18nService } from './services/i18n.service';
import { KeytarSecureStorageService } from './services/keytarSecureStorage.service';
import { SyncService } from './services/sync.service';

import { CliPlatformUtilsService } from 'jslib/cli/services/cliPlatformUtils.service';
import { ConsoleLogService } from 'jslib/cli/services/consoleLog.service';

import { AppIdService } from 'jslib/services/appId.service';
import { ConstantsService } from 'jslib/services/constants.service';
import { ContainerService } from 'jslib/services/container.service';
import { CryptoService } from 'jslib/services/crypto.service';
import { EnvironmentService } from 'jslib/services/environment.service';
import { LowdbStorageService } from 'jslib/services/lowdbStorage.service';
import { NodeApiService } from 'jslib/services/nodeApi.service';
import { NodeCryptoFunctionService } from 'jslib/services/nodeCryptoFunction.service';
import { NoopMessagingService } from 'jslib/services/noopMessaging.service';
import { TokenService } from 'jslib/services/token.service';
import { UserService } from 'jslib/services/user.service';

import { Program } from './program';

// tslint:disable-next-line
const packageJson = require('./package.json');

export class Main {
    logService: ConsoleLogService;
    messagingService: NoopMessagingService;
    storageService: LowdbStorageService;
    secureStorageService: KeytarSecureStorageService;
    i18nService: I18nService;
    platformUtilsService: CliPlatformUtilsService;
    constantsService: ConstantsService;
    cryptoService: CryptoService;
    tokenService: TokenService;
    appIdService: AppIdService;
    apiService: NodeApiService;
    environmentService: EnvironmentService;
    userService: UserService;
    containerService: ContainerService;
    cryptoFunctionService: NodeCryptoFunctionService;
    authService: AuthService;
    configurationService: ConfigurationService;
    syncService: SyncService;
    program: Program;

    constructor() {
        const applicationName = 'Bitwarden Directory Connector';
        let p = null;
        if (process.env.BITWARDENCLI_CONNECTOR_APPDATA_DIR) {
            p = path.resolve(process.env.BITWARDENCLI_CONNECTOR_APPDATA_DIR);
        } else if (process.env.BITWARDEN_CONNECTOR_APPDATA_DIR) {
            p = path.resolve(process.env.BITWARDEN_CONNECTOR_APPDATA_DIR);
        } else if (fs.existsSync(path.join(__dirname, 'bitwarden-connector-appdata'))) {
            p = path.join(__dirname, 'bitwarden-connector-appdata');
        } else if (process.platform === 'darwin') {
            p = path.join(process.env.HOME, 'Library/Application Support/' + applicationName);
        } else if (process.platform === 'win32') {
            p = path.join(process.env.APPDATA, applicationName);
        } else if (process.env.XDG_CONFIG_HOME) {
            p = path.join(process.env.XDG_CONFIG_HOME, applicationName);
        } else {
            p = path.join(process.env.HOME, '.config/' + applicationName);
        }

        this.i18nService = new I18nService('en', './locales');
        this.platformUtilsService = new CliPlatformUtilsService('connector', packageJson);
        this.logService = new ConsoleLogService(this.platformUtilsService.isDev(),
            (level) => process.env.BWCLI_DEBUG !== 'true' && level <= LogLevelType.Info);
        this.cryptoFunctionService = new NodeCryptoFunctionService();
        this.storageService = new LowdbStorageService(null, p, true);
        this.secureStorageService = new KeytarSecureStorageService(applicationName);
        this.cryptoService = new CryptoService(this.storageService, this.secureStorageService,
            this.cryptoFunctionService);
        this.appIdService = new AppIdService(this.storageService);
        this.tokenService = new TokenService(this.storageService);
        this.messagingService = new NoopMessagingService();
        this.apiService = new NodeApiService(this.tokenService, this.platformUtilsService,
            async (expired: boolean) => await this.logout());
        this.environmentService = new EnvironmentService(this.apiService, this.storageService, null);
        this.userService = new UserService(this.tokenService, this.storageService);
        this.containerService = new ContainerService(this.cryptoService);
        this.authService = new AuthService(this.cryptoService, this.apiService, this.userService, this.tokenService,
            this.appIdService, this.i18nService, this.platformUtilsService, this.messagingService, true);
        this.configurationService = new ConfigurationService(this.storageService, this.secureStorageService);
        this.syncService = new SyncService(this.configurationService, this.logService, this.cryptoFunctionService,
            this.apiService, this.messagingService, this.i18nService);
        this.program = new Program(this);
    }

    async run() {
        await this.init();
        this.program.run();
    }

    async logout() {
        await Promise.all([
            this.tokenService.clearToken(),
            this.userService.clear(),
        ]);
    }

    private async init() {
        this.storageService.init();
        this.containerService.attachToWindow(global);
        await this.environmentService.setUrlsFromStorage();
        // Dev Server URLs. Comment out the line above.
        // this.apiService.setUrls({
        //     base: null,
        //     api: 'http://localhost:4000',
        //     identity: 'http://localhost:33656',
        // });
        const locale = await this.storageService.get<string>(ConstantsService.localeKey);
        await this.i18nService.init(locale);
        this.authService.init();

        const installedVersion = await this.storageService.get<string>(ConstantsService.installedVersionKey);
        const currentVersion = this.platformUtilsService.getApplicationVersion();
        if (installedVersion == null || installedVersion !== currentVersion) {
            await this.storageService.save(ConstantsService.installedVersionKey, currentVersion);
        }
    }
}

const main = new Main();
main.run();
