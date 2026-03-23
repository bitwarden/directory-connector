import * as fs from "fs";
import * as path from "path";

import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";

import { LogService } from "@/libs/abstractions/log.service";
import { StorageService } from "@/libs/abstractions/storage.service";
import { NodeUtils } from "@/libs/utils/nodeUtils";
import { sequentialize } from "@/libs/utils/sequentialize";
import { Utils } from "@/libs/utils/utils";

import { SecureStorageKey, StorageKey } from "../models/state.model";

export class LowdbStorageService implements StorageService {
  protected dataFilePath: string;
  private db: LowSync<Record<string, any>>;
  private defaults: any;
  private ready = false;

  constructor(
    protected logService: LogService,
    defaults?: any,
    private dir?: string,
    private allowCache = false,
  ) {
    this.defaults = defaults;
  }

  @sequentialize(() => "lowdbStorageInit")
  async init() {
    if (this.ready) {
      return;
    }

    this.logService.info("Initializing lowdb storage service.");
    let adapter: JSONFileSync<Record<string, any>> | undefined;
    if (Utils.isNode && this.dir != null) {
      if (!fs.existsSync(this.dir)) {
        this.logService.warning(`Could not find dir, "${this.dir}"; creating it instead.`);
        NodeUtils.mkdirpSync(this.dir, "700");
        this.logService.info(`Created dir "${this.dir}".`);
      }
      this.dataFilePath = path.join(this.dir, "data.json");
      if (!fs.existsSync(this.dataFilePath)) {
        this.logService.warning(
          `Could not find data file, "${this.dataFilePath}"; creating it instead.`,
        );
        fs.writeFileSync(this.dataFilePath, "{}", { mode: 0o600 });
        fs.chmodSync(this.dataFilePath, 0o600);
        this.logService.info(`Created data file "${this.dataFilePath}" with chmod 600.`);
      } else {
        this.logService.info(`db file "${this.dataFilePath} already exists"; using existing db`);
      }
      await this.lockDbFile(() => {
        adapter = new JSONFileSync<Record<string, any>>(this.dataFilePath);
      });
    }
    try {
      this.logService.info("Attempting to create lowdb storage adapter.");
      this.db = new LowSync<Record<string, any>>(adapter, {});
      this.db.read();
      this.logService.info("Successfully created lowdb storage adapter.");
    } catch (e) {
      if (e instanceof SyntaxError) {
        this.logService.warning(
          `Error creating lowdb storage adapter, "${e.message}"; emptying data file.`,
        );
        if (fs.existsSync(this.dataFilePath)) {
          const backupPath = this.dataFilePath + ".bak";
          this.logService.warning(`Writing backup of data file to ${backupPath}`);
          await fs.copyFile(this.dataFilePath, backupPath, () => {
            this.logService.warning(
              `Error while creating data file backup, "${e.message}". No backup may have been created.`,
            );
          });
        }
        this.db.data = {};
        this.db.write();
      } else {
        this.logService.error(`Error creating lowdb storage adapter, "${e.message}".`);
        throw e;
      }
    }

    if (this.defaults != null) {
      this.lockDbFile(() => {
        this.logService.info("Writing defaults.");
        this.readForNoCache();
        this.db.data = { ...this.defaults, ...this.db.data };
        this.db.write();
        this.logService.info("Successfully wrote defaults to db.");
      });
    }

    this.ready = true;
  }

  async get<T>(key: StorageKey | SecureStorageKey): Promise<T> {
    await this.waitForReady();
    return this.lockDbFile(() => {
      this.readForNoCache();
      const val = this.db.data[key];
      this.logService.debug(`Successfully read ${key} from db`);
      if (val == null) {
        return null;
      }
      return val as T;
    });
  }

  has(key: StorageKey | SecureStorageKey): Promise<boolean> {
    return this.get(key).then((v) => v != null);
  }

  async save(key: StorageKey | SecureStorageKey, obj: any): Promise<any> {
    await this.waitForReady();
    return this.lockDbFile(() => {
      this.readForNoCache();
      this.db.data[key] = obj;
      this.db.write();
      this.logService.debug(`Successfully wrote ${key} to db`);
      return;
    });
  }

  async remove(key: StorageKey | SecureStorageKey): Promise<any> {
    await this.waitForReady();
    return this.lockDbFile(() => {
      this.readForNoCache();
      delete this.db.data[key];
      this.db.write();
      this.logService.debug(`Successfully removed ${key} from db`);
      return;
    });
  }

  protected async lockDbFile<T>(action: () => T): Promise<T> {
    // Lock methods implemented in clients
    return Promise.resolve(action());
  }

  private readForNoCache() {
    if (!this.allowCache) {
      this.db.read();
    }
  }

  private async waitForReady() {
    if (!this.ready) {
      await this.init();
    }
  }
}
