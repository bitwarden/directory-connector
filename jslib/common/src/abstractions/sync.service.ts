import {
  SyncFolderNotification,
} from "../models/response/notificationResponse";

export abstract class SyncService {
  syncInProgress: boolean;

  getLastSync: () => Promise<Date>;
  setLastSync: (date: Date, userId?: string) => Promise<any>;
  fullSync: (forceSync: boolean, allowThrowOnError?: boolean) => Promise<boolean>;
  syncUpsertFolder: (notification: SyncFolderNotification, isEdit: boolean) => Promise<boolean>;
  syncDeleteFolder: (notification: SyncFolderNotification) => Promise<boolean>;
}
