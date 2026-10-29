import { StorageOptions } from "@/libs/models/domain/storageOptions";
import { SecureStorageKey, StorageKey } from "@/libs/models/state.model";

export abstract class StorageService {
  get: <T>(key: StorageKey | SecureStorageKey, options?: StorageOptions) => Promise<T>;
  has: (key: StorageKey | SecureStorageKey, options?: StorageOptions) => Promise<boolean>;
  save: (key: StorageKey | SecureStorageKey, obj: any, options?: StorageOptions) => Promise<any>;
  remove: (key: StorageKey | SecureStorageKey, options?: StorageOptions) => Promise<any>;
}

/**
 * Secure storage with an additional `vNext` read/write path. Only use `vNext` for the Google
 * Workspace private key: on Windows it saves secrets in a format that fits Credential Manager's
 * size limit but that earlier versions of Directory Connector cannot read. Never call it from
 * existing state migrations.
 */
export abstract class SecureStorageService extends StorageService {
  getVNext: <T>(key: SecureStorageKey) => Promise<T>;
  saveVNext: (key: SecureStorageKey, obj: any) => Promise<any>;
}
