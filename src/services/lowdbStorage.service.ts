import * as lock from "proper-lockfile";

import { LogService } from "@/jslib/common/src/abstractions/log.service";
import Utils from "@/jslib/common/src/misc/utils";
import { LowdbStorageService as LowdbStorageServiceBase } from "@/jslib/node/src/services/lowdbStorage.service";

export class LowdbStorageService extends LowdbStorageServiceBase {
  constructor(
    logService: LogService,
    defaults?: any,
    dir?: string,
    allowCache = false,
    private requireLock = false,
  ) {
    super(logService, defaults, dir, allowCache);
  }

  protected async lockDbFile<T>(action: () => T): Promise<T> {
    if (this.requireLock && !Utils.isNullOrWhitespace(this.dataFilePath)) {
      this.logService.info("acquiring db file lock");
      return await lock.lock(this.dataFilePath, { retries: 3 }).then((release) => {
        try {
          return action();
        } finally {
          release();
        }
      });
    } else {
      return action();
    }
  }
}
