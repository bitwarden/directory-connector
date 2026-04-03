import { ipcRenderer } from "electron";

import { StorageService } from "@/libs/abstractions/storage.service";
import { SecureStorageKey, StorageKey } from "@/libs/models/state.model";

export class ElectronRendererStorageService implements StorageService {
  get<T>(key: StorageKey | SecureStorageKey): Promise<T> {
    return ipcRenderer.invoke("storageService", {
      action: "get",
      key: key,
    });
  }

  has(key: StorageKey | SecureStorageKey): Promise<boolean> {
    return ipcRenderer.invoke("storageService", {
      action: "has",
      key: key,
    });
  }

  save(key: StorageKey | SecureStorageKey, obj: any): Promise<any> {
    return ipcRenderer.invoke("storageService", {
      action: "save",
      key: key,
      obj: obj,
    });
  }

  remove(key: StorageKey | SecureStorageKey): Promise<any> {
    return ipcRenderer.invoke("storageService", {
      action: "remove",
      key: key,
    });
  }
}
