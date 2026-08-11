import { StorageService } from "@/libs/abstractions/storage.service";
import { SecureStorageKey, StorageKey } from "@/libs/models/state.model";

export class ElectronRendererSecureStorageService implements StorageService {
  get<T>(key: StorageKey | SecureStorageKey): Promise<T> {
    return window.ipc.ipcRenderer.invoke("secureStorageService", { action: "get", key });
  }

  has(key: StorageKey | SecureStorageKey): Promise<boolean> {
    return window.ipc.ipcRenderer.invoke("secureStorageService", { action: "has", key });
  }

  save(key: StorageKey | SecureStorageKey, obj: any): Promise<any> {
    return window.ipc.ipcRenderer.invoke("secureStorageService", { action: "save", key, obj });
  }

  remove(key: StorageKey | SecureStorageKey): Promise<any> {
    return window.ipc.ipcRenderer.invoke("secureStorageService", { action: "remove", key });
  }
}
