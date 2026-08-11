import { StorageService } from "@/libs/abstractions/storage.service";
import { SecureStorageKey, StorageKey } from "@/libs/models/state.model";

export class ElectronRendererStorageService implements StorageService {
  get<T>(key: StorageKey | SecureStorageKey): Promise<T> {
    return ipc.storage.get<T>(key);
  }

  has(key: StorageKey | SecureStorageKey): Promise<boolean> {
    return ipc.storage.has(key);
  }

  save(key: StorageKey | SecureStorageKey, obj: any): Promise<void> {
    return ipc.storage.save(key, obj);
  }

  remove(key: StorageKey | SecureStorageKey): Promise<void> {
    return ipc.storage.remove(key);
  }
}
