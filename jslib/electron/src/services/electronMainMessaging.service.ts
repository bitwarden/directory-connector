import { app, dialog, ipcMain, Menu, MenuItem, nativeTheme } from "electron";

import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { ThemeType } from "@/jslib/common/src/enums/themeType";

import { RendererMenuItem } from "../utils";
import { WindowMain } from "../window.main";

export class ElectronMainMessagingService implements MessagingService {
  constructor(private windowMain: WindowMain, private onMessage: (message: any) => void) {
    ipcMain.handle("appVersion", () => {
      return app.getVersion();
    });

    ipcMain.handle("systemTheme", () => {
      return nativeTheme.shouldUseDarkColors ? ThemeType.Dark : ThemeType.Light;
    });

    ipcMain.handle("showMessageBox", (event, options) => {
      return dialog.showMessageBox(this.windowMain.win, options);
    });

    ipcMain.handle("openContextMenu", (event, options: { menu: RendererMenuItem[] }) => {
      return new Promise((resolve) => {
        const menu = new Menu();
        options.menu.forEach((m, index) => {
          menu.append(
            new MenuItem({
              label: m.label,
              type: m.type,
              click: () => {
                resolve(index);
              },
            })
          );
        });
        menu.popup({
          window: windowMain.win,
          callback: () => {
            resolve(-1);
          },
        });
      });
    });

    ipcMain.handle("windowVisible", () => {
      return windowMain.win?.isVisible();
    });

    nativeTheme.on("updated", () => {
      windowMain.win?.webContents.send(
        "systemThemeUpdated",
        nativeTheme.shouldUseDarkColors ? ThemeType.Dark : ThemeType.Light
      );
    });
  }

  send(subscriber: string, arg: any = {}) {
    const message = Object.assign({}, { command: subscriber }, arg);
    this.onMessage(message);
    if (this.windowMain.win != null) {
      this.windowMain.win.webContents.send("messagingService", message);
    }
  }
}
