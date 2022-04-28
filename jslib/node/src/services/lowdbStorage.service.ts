import * as fs from "fs";
import * as path from "path";

import * as lowdb from "lowdb";
import * as FileSync from "lowdb/adapters/FileSync";

import { LogService } from "jslib-common/abstractions/log.service";
import { StorageService } from "jslib-common/abstractions/storage.service";
import { NodeUtils } from "jslib-common/misc/nodeUtils";
import { sequentialize } from "jslib-common/misc/sequentialize";
import { Utils } from "jslib-common/misc/utils";

export class LowdbStorageService implements StorageService {
  protected dataFilePath: string;
  private db: lowdb.LowdbSync<any>;
  private defaults: any;
  private ready = false;

  constructor(
    protected logService: LogService,
    defaults?: any,
    private dir?: string,
    private allowCache = false
  ) {
    this.defaults = defaults;
  }

  @sequentialize(() => "lowdbStorageInit")
  async init() {
    if (this.ready) {
      return;
    }

    this.logService.info("Initializing lowdb storage service.");
    let adapter: lowdb.AdapterSync<any>;
    if (Utils.isNode && this.dir != null) {
      if (!fs.existsSync(this.dir)) {
        this.logService.warning(`Could not find dir, "${this.dir}"; creating it instead.`);
        NodeUtils.mkdirpSync(this.dir, "700");
        this.logService.info(`Created dir "${this.dir}".`);
      }
      this.dataFilePath = path.join(this.dir, "data.json");
      if (!fs.existsSync(this.dataFilePath)) {
        this.logService.warning(
          `Could not find data file, "${this.dataFilePath}"; creating it instead.`
        );
        fs.writeFileSync(this.dataFilePath, "", { mode: 0o600 });
        fs.chmodSync(this.dataFilePath, 0o600);
        this.logService.info(`Created data file "${this.dataFilePath}" with chmod 600.`);
      } else {
        this.logService.info(`db file "${this.dataFilePath} already exists"; using existing db`);
      }
      await this.lockDbFile(() => {
        adapter = new FileSync(this.dataFilePath);
      });
    }
    try {
      this.logService.info("Attempting to create lowdb storage adapter.");
      this.db = lowdb(adapter);
      this.logService.info("Successfully created lowdb storage adapter.");
    } catch (e) {
      if (e instanceof SyntaxError) {
        this.logService.warning(
          `Error creating lowdb storage adapter, "${e.message}"; emptying data file.`
        );
        if (fs.existsSync(this.dataFilePath)) {
          const backupPath = this.dataFilePath + ".bak";
          this.logService.warning(`Writing backup of data file to ${backupPath}`);
          await fs.copyFile(this.dataFilePath, backupPath, () => {
            this.logService.warning(
              `Error while creating data file backup, "${e.message}". No backup may have been created.`
            );
          });
        }
        adapter.write({});
        this.db = lowdb(adapter);
      } else {
        this.logService.error(`Error creating lowdb storage adapter, "${e.message}".`);
        throw e;
      }
    }

    if (this.defaults != null) {
      this.lockDbFile(() => {
        this.logService.info("Writing defaults.");
        this.readForNoCache();
        this.db.defaults(this.defaults).write();
        this.logService.info("Successfully wrote defaults to db.");
      });
    }

    this.ready = true;
  }

  async get<T>(key: string): Promise<T> {
    await this.waitForReady();
    return this.lockDbFile(() => {
      this.readForNoCache();
      const val = this.db.get(key).value();
      this.logService.debug(`Successfully read ${key} from db`);
      if (val == null) {
        return null;
      }
      return val as T;
    });
  }

  has(key: string): Promise<boolean> {
    return this.get(key).then((v) => v != null);
  }

  async save(key: string, obj: any): Promise<any> {
    await this.waitForReady();
    return this.lockDbFile(() => {
      this.readForNoCache();
      this.db.set(key, obj).write();
      this.logService.debug(`Successfully wrote ${key} to db`);
      return;
    });
  }

  async remove(key: string): Promise<any> {
    await this.waitForReady();
    return this.lockDbFile(() => {
      this.readForNoCache();
      this.db.unset(key).write();
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
