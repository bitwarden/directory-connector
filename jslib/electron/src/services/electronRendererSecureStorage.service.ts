import { ipcRenderer } from "electron";

import { StorageService } from "@/jslib/common/src/abstractions/storage.service";

import { SecureStorageKey, StorageKey } from "@/src/models/state.model";

export class ElectronRendererSecureStorageService implements StorageService {
  async get<T>(key: string): Promise<T> {
    const val = ipcRenderer.sendSync("keytar", {
      action: "getPassword",
      key: key,
      keySuffix: "",
    });
    return Promise.resolve(val != null ? (JSON.parse(val) as T) : null);
  }

  async has(key: string): Promise<boolean> {
    const val = ipcRenderer.sendSync("keytar", {
      action: "hasPassword",
      key: key,
      keySuffix: "",
    });
    return Promise.resolve(!!val);
  }

  async save(key: StorageKey | SecureStorageKey, obj: any): Promise<any> {
    ipcRenderer.sendSync("keytar", {
      action: "setPassword",
      key: key,
      keySuffix: "",
      value: JSON.stringify(obj),
    });
    return Promise.resolve();
  }

  async remove(key: string): Promise<any> {
    ipcRenderer.sendSync("keytar", {
      action: "deletePassword",
      key: key,
      keySuffix: "",
    });
    return Promise.resolve();
  }
}
