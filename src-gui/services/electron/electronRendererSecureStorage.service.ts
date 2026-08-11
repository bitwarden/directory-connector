import { StorageService } from "@/libs/abstractions/storage.service";
import { SecureStorageKey, StorageKey } from "@/libs/models/state.model";

export class ElectronRendererSecureStorageService implements StorageService {
  get<T>(key: StorageKey | SecureStorageKey): Promise<T> {
    return ipc.secureStorage.get<T>(key);
  }

  has(key: StorageKey | SecureStorageKey): Promise<boolean> {
    return ipc.secureStorage.has(key);
  }

  save(key: StorageKey | SecureStorageKey, obj: any): Promise<void> {
    return ipc.secureStorage.save(key, obj);
  }

  remove(key: StorageKey | SecureStorageKey): Promise<void> {
    return ipc.secureStorage.remove(key);
  }
}
