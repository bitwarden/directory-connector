import { app, dialog, ipcMain } from "electron";

import { MessagingService } from "@/libs/abstractions/messaging.service";

import { WindowMain } from "@/src-gui/window.main";

export class ElectronMainMessagingService implements MessagingService {
  constructor(
    private windowMain: WindowMain,
    private onMessage: (message: any) => void,
  ) {
    ipcMain.handle("appVersion", () => {
      return app.getVersion();
    });

    ipcMain.handle("showMessageBox", (event, options) => {
      return dialog.showMessageBox(this.windowMain.win, options);
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
