export abstract class MessagingService {
  send: (subscriber: string, arg?: any) => void;
}
