import { SecureStorageKey, StorageKey } from "@/src/models/state.model";

import { StorageOptions } from "../models/domain/storageOptions";

export abstract class StorageService {
  get: <T>(key: StorageKey | SecureStorageKey, options?: StorageOptions) => Promise<T>;
  has: (key: StorageKey | SecureStorageKey, options?: StorageOptions) => Promise<boolean>;
  save: (key: StorageKey | SecureStorageKey, obj: any, options?: StorageOptions) => Promise<any>;
  remove: (key: StorageKey | SecureStorageKey, options?: StorageOptions) => Promise<any>;
}
