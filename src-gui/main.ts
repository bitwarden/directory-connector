import * as fs from "fs";
import * as path from "path";

import { app, BrowserWindow, dialog, ipcMain } from "electron";

import { APPLICATION_NAME } from "@/libs/constants";
import { AppIdService } from "@/libs/services/appId.service";
import { AuthService } from "@/libs/services/auth.service";
import { BatchRequestBuilder } from "@/libs/services/batch-request-builder";
import { DefaultDirectoryFactoryService } from "@/libs/services/directory-factory.service";
import { DefaultEnvironmentService } from "@/libs/services/environment/environment.service";
import { I18nService } from "@/libs/services/i18n.service";
import { NativeSecureStorageService } from "@/libs/services/nativeSecureStorage.service";
import { NodeApiService } from "@/libs/services/nodeApi.service";
import { NodeCryptoFunctionService } from "@/libs/services/nodeCryptoFunction.service";
import { SingleRequestBuilder } from "@/libs/services/single-request-builder";
import { DefaultStateService } from "@/libs/services/state-service/default-state.service";
import { StateMigrationService } from "@/libs/services/state-service/stateMigration.service";
import { SyncService } from "@/libs/services/sync.service";
import { TokenService } from "@/libs/services/token/token.service";

import { ElectronLogService } from "@/src-gui/services/electron/electronLog.service";
import { ElectronMainMessagingService } from "@/src-gui/services/electron/electronMainMessaging.service";
import { ElectronStorageService } from "@/src-gui/services/electron/electronStorage.service";
import { MainPlatformUtilsService } from "@/src-gui/services/electron/mainPlatformUtils.service";
import { TrayMain } from "@/src-gui/tray.main";
import { UpdaterMain } from "@/src-gui/updater.main";
import { WindowMain } from "@/src-gui/window.main";

import { DCCredentialStorageListener } from "./main/credential-storage-listener";
import { MenuMain } from "./main/menu.main";
import { MessagingMain } from "./main/messaging.main";

// Normalize non-Error rejections to Error so they serialize correctly over IPC.
function handle(channel: string, handler: Parameters<typeof ipcMain.handle>[1]) {
  ipcMain.handle(channel, async (...args) => {
    try {
      return await handler(...args);
    } catch (e: unknown) {
      if (e instanceof Error) {
        throw e;
      }

      const msg = (e as any)?.message ?? String(e);
      throw new Error(msg);
    }
  });
}

export class Main {
  logService: ElectronLogService;
  i18nService: I18nService;
  storageService: ElectronStorageService;
  messagingService: ElectronMainMessagingService;
  credentialStorageListener: DCCredentialStorageListener;
  stateService: DefaultStateService;

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
    } else if (process.platform === "win32" && process.env.PORTABLE_EXECUTABLE_DIR != null) {
      appDataPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR, "bitwarden-connector-appdata");
    }

    if (appDataPath != null) {
      app.setPath("userData", appDataPath);
    }
    app.setPath("logs", path.join(app.getPath("userData"), "logs"));

    const args = process.argv.slice(1);
    if (args.some((val) => val === "--watch")) {
      fs.watch(__dirname, { recursive: true }, (_, filename) => {
        if (filename && !/node_modules|[/\\]\./.test(filename)) {
          BrowserWindow.getAllWindows().forEach((bw) => bw.webContents.reloadIgnoringCache());
        }
      });
    }

    this.logService = new ElectronLogService(null, app.getPath("userData"));
    this.logService.init();
    this.i18nService = new I18nService("en", "./locales/");
    this.storageService = new ElectronStorageService(app.getPath("userData"));

    const secureStorageService = new NativeSecureStorageService(APPLICATION_NAME, this.logService);
    const stateMigrationService = new StateMigrationService(
      this.storageService,
      secureStorageService,
      this.logService,
    );

    this.stateService = new DefaultStateService(
      this.storageService,
      secureStorageService,
      this.logService,
      stateMigrationService,
      true,
    );

    const platformUtilsService = new MainPlatformUtilsService();
    const cryptoFunctionService = new NodeCryptoFunctionService();
    const tokenService = new TokenService(secureStorageService);
    const environmentService = new DefaultEnvironmentService(this.stateService);
    const appIdService = new AppIdService(this.storageService);

    const customUserAgent = `Bitwarden_DC/${app.getVersion()} (${platformUtilsService.getDeviceString().toUpperCase()})`;

    const apiService = new NodeApiService(
      tokenService,
      platformUtilsService,
      environmentService,
      appIdService,
      async (expired: boolean) => {
        this.messagingService?.send("logout", { expired });
      },
      customUserAgent,
    );

    const authService = new AuthService(
      apiService,
      appIdService,
      platformUtilsService,
      { send: (subscriber: string, arg: any = {}) => this.messagingService?.send(subscriber, arg) },
      this.stateService,
    );

    const directoryFactory = new DefaultDirectoryFactoryService(
      this.logService,
      this.i18nService,
      this.stateService,
    );

    const syncService = new SyncService(
      cryptoFunctionService,
      apiService,
      { send: (subscriber: string, arg: any = {}) => this.messagingService?.send(subscriber, arg) },
      this.i18nService,
      this.stateService,
      new BatchRequestBuilder(),
      new SingleRequestBuilder(),
      directoryFactory,
    );

    ipcMain.on("log", (_event, { level, message }: { level: number; message: string }) => {
      this.logService.write(level, message);
    });

    handle(
      "secureStorageService",
      (_event, options: { action: string; key: string; obj?: any }) => {
        switch (options.action) {
          case "get":
            return secureStorageService.get(options.key as any);
          case "has":
            return secureStorageService.has(options.key as any);
          case "save":
            return secureStorageService.save(options.key as any, options.obj);
          case "remove":
            return secureStorageService.remove(options.key as any);
          default:
            throw new Error(`Unknown secureStorageService action: ${options.action}`);
        }
      },
    );

    handle(
      "auth:login",
      async (_event, credentials: { clientId: string; clientSecret: string }) => {
        await authService.logIn(credentials);
      },
    );

    handle("auth:logout", async () => {
      await this.stateService.clearAuthTokens();
    });

    handle("sync:run", async (_event, { force, test }: { force: boolean; test: boolean }) => {
      const [groups, users] = await syncService.sync(force, test);
      return [groups?.map((g) => g.toJSON()) ?? null, users?.map((u) => u.toJSON()) ?? null];
    });

    this.windowMain = new WindowMain(
      this.stateService,
      this.logService,
      false,
      800,
      600,
      (arg) => this.processDeepLink(arg),
      null,
    );

    this.menuMain = new MenuMain(this);
    this.updaterMain = new UpdaterMain(
      this.i18nService,
      this.windowMain,
      "directory-connector",
      () => {
        this.messagingService.send("checkingForUpdate");
      },
      () => {
        this.messagingService.send("doneCheckingForUpdate");
      },
      () => {
        this.messagingService.send("doneCheckingForUpdate");
      },
      "bitwardenDirectoryConnector",
    );

    this.trayMain = new TrayMain(this.windowMain, this.i18nService, this.stateService);

    this.messagingMain = new MessagingMain(
      this.windowMain,
      this.menuMain,
      this.updaterMain,
      this.trayMain,
    );
    this.messagingService = new ElectronMainMessagingService(this.windowMain, (message) => {
      this.messagingMain.onMessage(message);
    });

    this.credentialStorageListener = new DCCredentialStorageListener(
      "Bitwarden Directory Connector",
    );
  }

  async bootstrap() {
    this.credentialStorageListener.init();
    try {
      await this.windowMain.init();
      await this.stateService.init();
      await this.i18nService.init(app.getLocale());
      this.menuMain.init();
      this.messagingMain.init();
      await this.updaterMain.init();
      await this.trayMain.init(this.i18nService.t("bitwardenDirectoryConnector"));

      if (!app.isDefaultProtocolClient("bwdc")) {
        app.setAsDefaultProtocolClient("bwdc");
      }

      app.on("open-url", (event, url) => {
        event.preventDefault();
        this.processDeepLink([url]);
      });
    } catch (e: any) {
      this.logService.error(e);
      dialog.showErrorBox(this.i18nService.t("errorOccurred") ?? "Error", e?.message ?? String(e));
      app.quit();
    }
  }

  private processDeepLink(argv: string[]): void {
    argv
      .filter((s) => s.indexOf("bwdc://") === 0)
      .forEach((s) => {
        const url = new URL(s);
        const code = url.searchParams.get("code");
        const receivedState = url.searchParams.get("state");
        if (code != null && receivedState != null) {
          this.messagingService.send("ssoCallback", { code: code, state: receivedState });
        }
      });
  }
}

const main = new Main();
main.bootstrap();
