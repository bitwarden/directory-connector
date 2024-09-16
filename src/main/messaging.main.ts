import { ipcMain } from "electron";

import { TrayMain } from "@/jslib/electron/src/tray.main";
import { UpdaterMain } from "@/jslib/electron/src/updater.main";
import { WindowMain } from "@/jslib/electron/src/window.main";

import { MenuMain } from "./menu.main";

const SyncCheckInterval = 60 * 1000; // 1 minute

export class MessagingMain {
  private syncTimeout: NodeJS.Timeout;

  constructor(
    private windowMain: WindowMain,
    private menuMain: MenuMain,
    private updaterMain: UpdaterMain,
    private trayMain: TrayMain,
  ) {}

  init() {
    ipcMain.on("messagingService", async (event: any, message: any) => this.onMessage(message));
  }

  onMessage(message: any) {
    switch (message.command) {
      case "checkForUpdate":
        this.updaterMain.checkForUpdate(true);
        break;
      case "scheduleNextDirSync":
        this.scheduleNextSync();
        break;
      case "cancelDirSync":
        this.windowMain.win.webContents.send("messagingService", {
          command: "syncScheduleStopped",
        });
        if (this.syncTimeout) {
          global.clearTimeout(this.syncTimeout);
        }
        break;
      case "hideToTray":
        this.trayMain.hideToTray();
        break;
      default:
        break;
    }
  }

  private scheduleNextSync() {
    this.windowMain.win.webContents.send("messagingService", {
      command: "syncScheduleStarted",
    });

    if (this.syncTimeout) {
      global.clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = global.setTimeout(() => {
      if (this.windowMain.win == null) {
        return;
      }

      this.windowMain.win.webContents.send("messagingService", {
        command: "checkDirSync",
      });
    }, SyncCheckInterval);
  }
}
