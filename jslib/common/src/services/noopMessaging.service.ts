import { MessagingService } from "../abstractions/messaging.service";

export class NoopMessagingService implements MessagingService {
  send(subscriber: string, arg: any = {}) {
    // Do nothing...
  }
}
