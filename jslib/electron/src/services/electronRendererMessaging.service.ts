import { ipcRenderer } from "electron";

import { BroadcasterService } from "jslib-common/abstractions/broadcaster.service";
import { MessagingService } from "jslib-common/abstractions/messaging.service";

export class ElectronRendererMessagingService implements MessagingService {
  constructor(private broadcasterService: BroadcasterService) {
    ipcRenderer.on("messagingService", async (event: any, message: any) => {
      if (message.command) {
        this.sendMessage(message.command, message, false);
      }
    });
  }

  send(subscriber: string, arg: any = {}) {
    this.sendMessage(subscriber, arg, true);
  }

  private sendMessage(subscriber: string, arg: any = {}, toMain: boolean) {
    const message = Object.assign({}, { command: subscriber }, arg);
    this.broadcasterService.send(message);
    if (toMain) {
      ipcRenderer.send("messagingService", message);
    }
  }
}
