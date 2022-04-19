import * as fs from "fs";

import { ipcMain } from "electron";

import { StorageService } from "jslib-common/abstractions/storage.service";
import { NodeUtils } from "jslib-common/misc/nodeUtils";

// eslint-disable-next-line
const Store = require("electron-store");

export class ElectronStorageService implements StorageService {
  private store: any;

  constructor(dir: string, defaults = {}) {
    if (!fs.existsSync(dir)) {
      NodeUtils.mkdirpSync(dir, "700");
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

  get<T>(key: string): Promise<T> {
    const val = this.store.get(key) as T;
    return Promise.resolve(val != null ? val : null);
  }

  has(key: string): Promise<boolean> {
    const val = this.store.get(key);
    return Promise.resolve(val != null);
  }

  save(key: string, obj: any): Promise<any> {
    if (obj instanceof Set) {
      obj = Array.from(obj);
    }
    this.store.set(key, obj);
    return Promise.resolve();
  }

  remove(key: string): Promise<any> {
    this.store.delete(key);
    return Promise.resolve();
  }
}
