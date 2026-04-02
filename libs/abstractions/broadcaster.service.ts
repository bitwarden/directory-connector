export abstract class BroadcasterService {
  send: (message: any, id?: string) => void;
  subscribe: (id: string, messageCallback: (message: any) => any) => void;
  unsubscribe: (id: string) => void;
}
