import { StorageOptions } from "@/libs/models/domain/storageOptions";
import { SecureStorageKey, StorageKey } from "@/libs/models/state.model";

export abstract class StorageService {
  get: <T>(key: StorageKey | SecureStorageKey, options?: StorageOptions) => Promise<T>;
  has: (key: StorageKey | SecureStorageKey, options?: StorageOptions) => Promise<boolean>;
  save: (key: StorageKey | SecureStorageKey, obj: any, options?: StorageOptions) => Promise<any>;
  remove: (key: StorageKey | SecureStorageKey, options?: StorageOptions) => Promise<any>;
}

/**
 * Storage backed by OS secure storage. Kept as a distinct type from {@link StorageService} so
 * callers that must store secrets cannot be given plaintext storage by mistake, and so it can be
 * used as its own Angular injection token.
 */
export abstract class SecureStorageService extends StorageService {}
