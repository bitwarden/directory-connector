import { app } from 'electron';
import * as path from 'path';

import { MenuMain } from './main/menu.main';
import { MessagingMain } from './main/messaging.main';
import { I18nService } from './services/i18n.service';

import { KeytarStorageListener } from 'jslib/electron/keytarStorageListener';
import { ElectronLogService } from 'jslib/electron/services/electronLog.service';
import { ElectronMainMessagingService } from 'jslib/electron/services/electronMainMessaging.service';
import { ElectronStorageService } from 'jslib/electron/services/electronStorage.service';
import { TrayMain } from 'jslib/electron/tray.main';
import { UpdaterMain } from 'jslib/electron/updater.main';
import { WindowMain } from 'jslib/electron/window.main';

export class Main {
    logService: ElectronLogService;
    i18nService: I18nService;
    storageService: ElectronStorageService;
    messagingService: ElectronMainMessagingService;
    keytarStorageListener: KeytarStorageListener;

    windowMain: WindowMain;
    messagingMain: MessagingMain;
    menuMain: MenuMain;
    updaterMain: UpdaterMain;
    trayMain: TrayMain;

    constructor() {
        // Set paths for portable builds
        let appDataPath = null;
        if (process.env.BITWARDEN_CONNECTOR_APPDATA_DIR != null) {
            appDataPath = process.env.BITWARDEN_CONNECTOR_APPDATA_DIR;
        } else if (process.platform === 'win32' && process.env.PORTABLE_EXECUTABLE_DIR != null) {
            appDataPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'bitwarden-connector-appdata');
        }

        if (appDataPath != null) {
            app.setPath('userData', appDataPath);
        }
        app.setPath('logs', path.join(app.getPath('userData'), 'logs'));

        const args = process.argv.slice(1);
        const watch = args.some((val) => val === '--watch');

        if (watch) {
            // tslint:disable-next-line
            require('electron-reload')(__dirname, {});
        }

        this.logService = new ElectronLogService(null, app.getPath('userData'));
        this.i18nService = new I18nService('en', './locales/');
        this.storageService = new ElectronStorageService(app.getPath('userData'));

        this.windowMain = new WindowMain(this.storageService, false, 800, 600,
            (arg) => this.processDeepLink(arg));
        this.menuMain = new MenuMain(this);
        this.updaterMain = new UpdaterMain(this.i18nService, this.windowMain, 'directory-connector', () => {
            this.messagingService.send('checkingForUpdate');
        }, () => {
            this.messagingService.send('doneCheckingForUpdate');
        }, () => {
            this.messagingService.send('doneCheckingForUpdate');
        }, 'bitwardenDirectoryConnector');
        this.trayMain = new TrayMain(this.windowMain, this.i18nService, this.storageService);
        this.messagingMain = new MessagingMain(this.windowMain, this.menuMain, this.updaterMain, this.trayMain);
        this.messagingService = new ElectronMainMessagingService(this.windowMain, (message) => {
            this.messagingMain.onMessage(message);
        });

        this.keytarStorageListener = new KeytarStorageListener('Bitwarden Directory Connector');
    }

    bootstrap() {
        this.keytarStorageListener.init();
        this.windowMain.init().then(async () => {
            await this.i18nService.init(app.getLocale());
            this.menuMain.init();
            this.messagingMain.init();
            await this.updaterMain.init();
            await this.trayMain.init(this.i18nService.t('bitwardenDirectoryConnector'));

            if (!app.isDefaultProtocolClient('bwdc')) {
                app.setAsDefaultProtocolClient('bwdc');
            }

            // Process protocol for macOS
            app.on('open-url', (event, url) => {
                event.preventDefault();
                this.processDeepLink([url]);
            });
        }, (e: any) => {
            // tslint:disable-next-line
            console.error(e);
        });
    }

    private processDeepLink(argv: string[]): void {
        argv.filter((s) => s.indexOf('bwdc://') === 0).forEach((s) => {
            const url = new URL(s);
            const code = url.searchParams.get('code');
            const receivedState = url.searchParams.get('state');
            if (code != null && receivedState != null) {
                this.messagingService.send('ssoCallback', { code: code, state: receivedState });
            }
        });
    }
}

const main = new Main();
main.bootstrap();
