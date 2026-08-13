import { BroadcasterService } from "@/libs/abstractions/broadcaster.service";
import { MessagingService } from "@/libs/abstractions/messaging.service";

export class ElectronRendererMessagingService implements MessagingService {
  constructor(private broadcasterService: BroadcasterService) {
    ipc.messaging.on((_event, message) => {
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
      ipc.messaging.send(message);
    }
  }
}
