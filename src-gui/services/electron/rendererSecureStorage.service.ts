import { SecureStorageService } from "@/libs/abstractions/storage.service";
import { SecureStorageKey, StorageKey } from "@/libs/models/state.model";

export class RendererSecureStorageService implements SecureStorageService {
  get<T>(key: StorageKey | SecureStorageKey): Promise<T> {
    return ipc.secureStorage.get<T>(key);
  }

  getVNext<T>(key: SecureStorageKey): Promise<T> {
    return ipc.secureStorage.getVNext<T>(key);
  }

  has(key: StorageKey | SecureStorageKey): Promise<boolean> {
    return ipc.secureStorage.has(key);
  }

  save(key: StorageKey | SecureStorageKey, obj: any): Promise<void> {
    return ipc.secureStorage.save(key, obj);
  }

  saveVNext(key: SecureStorageKey, obj: any): Promise<void> {
    return ipc.secureStorage.saveVNext(key, obj);
  }

  remove(key: StorageKey | SecureStorageKey): Promise<void> {
    return ipc.secureStorage.remove(key);
  }
}
