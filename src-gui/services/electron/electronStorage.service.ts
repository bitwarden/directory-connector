import * as fs from "fs";

import { ipcMain } from "electron";
import Store from "electron-store";

import { StorageService } from "@/libs/abstractions/storage.service";
import { SecureStorageKey, StorageKey } from "@/libs/models/state.model";
import { NodeUtils } from "@/libs/utils/nodeUtils";

export class ElectronStorageService implements StorageService {
  private store: any;

  constructor(dir: string, defaults = {}) {
    if (!fs.existsSync(dir)) {
      NodeUtils.mkdirpSync(dir, "700");
    }

    // On Windows, a previous version could write data.json as UTF-16 LE (BOM or null-prefixed).
    // electron-store reads files as UTF-8 and throws "invalid nul value" when it encounters
    // UTF-16 content. Detect and re-encode to UTF-8 before electron-store opens the file.
    const dataFile = `${dir}/data.json`;
    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile);
      // UTF-16 LE BOM is 0xFF 0xFE; null at position 1 (second byte of first char) also indicates UTF-16 LE
      if ((raw[0] === 0xff && raw[1] === 0xfe) || (raw.length > 1 && raw[1] === 0x00)) {
        const content = raw.toString("utf16le").replace(/^\uFEFF/, "");
        fs.writeFileSync(dataFile, content, "utf8");
      }
    }

    const storeConfig: any = {
      defaults: defaults,
      name: "data",
    };
    this.store = new Store(storeConfig);

    ipcMain.handle("storageService", (event, options) => {
      switch (options.action) {
        case "get":
          return this.get(options.key);
        case "has":
          return this.has(options.key);
        case "save":
          return this.save(options.key, options.obj);
        case "remove":
          return this.remove(options.key);
      }
    });
  }

  get<T>(key: StorageKey | SecureStorageKey): Promise<T> {
    const val = this.store.get(key) as T;
    return Promise.resolve(val != null ? val : null);
  }

  has(key: StorageKey | SecureStorageKey): Promise<boolean> {
    const val = this.store.get(key);
    return Promise.resolve(val != null);
  }

  save(key: StorageKey | SecureStorageKey, obj: any): Promise<any> {
    if (obj instanceof Set) {
      obj = Array.from(obj);
    }
    this.store.set(key, obj);
    return Promise.resolve();
  }

  remove(key: StorageKey | SecureStorageKey): Promise<any> {
    this.store.delete(key);
    return Promise.resolve();
  }
}
