export abstract class NotificationsService {
  init: () => Promise<void>;
  updateConnection: (sync?: boolean) => Promise<void>;
  reconnectFromActivity: () => Promise<void>;
  disconnectFromInactivity: () => Promise<void>;
}
