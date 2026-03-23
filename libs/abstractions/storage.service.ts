import { StorageOptions } from "@/libs/models/domain/storageOptions";
import { SecureStorageKey, StorageKey } from "@/libs/models/state.model";

export abstract class StorageService {
  get: <T>(key: StorageKey | SecureStorageKey, options?: StorageOptions) => Promise<T>;
  has: (key: StorageKey | SecureStorageKey, options?: StorageOptions) => Promise<boolean>;
  save: (key: StorageKey | SecureStorageKey, obj: any, options?: StorageOptions) => Promise<any>;
  remove: (key: StorageKey | SecureStorageKey, options?: StorageOptions) => Promise<any>;
}
