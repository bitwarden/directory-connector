import {
} from "../models/response/notificationResponse";

export abstract class SyncService {
  syncInProgress: boolean;

  getLastSync: () => Promise<Date>;
  setLastSync: (date: Date, userId?: string) => Promise<any>;
  fullSync: (forceSync: boolean, allowThrowOnError?: boolean) => Promise<boolean>;
}
