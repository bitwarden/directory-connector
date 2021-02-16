import * as fs from 'fs';
import * as lock from 'proper-lockfile';

import { LogService } from 'jslib/abstractions/log.service';

import { LowdbStorageService as LowdbStorageServiceBase } from 'jslib/services/lowdbStorage.service';

import { Utils } from 'jslib/misc/utils';

export class LowdbStorageService extends LowdbStorageServiceBase {
    constructor(logService: LogService, defaults?: any, dir?: string, allowCache = false, private requireLock = false) {
        super(logService, defaults, dir, allowCache);
    }

    async init() {
        if (!fs.existsSync(this.dataFilePath)) {
            this.logService.warning(`Could not find data file, "${this.dataFilePath}"; creating it instead.`);
            fs.writeFileSync(this.dataFilePath, '', { mode: 0o600 });
            fs.chmodSync(this.dataFilePath, 0o600);
            this.logService.info(`Created data file "${this.dataFilePath}" with chmod 600.`);
        }
        super.init();
    }

    protected async lockDbFile<T>(action: () => T): Promise<T> {
        if (this.requireLock && !Utils.isNullOrWhitespace(this.dataFilePath)) {
            this.logService.info('acquiring db file lock');
            return await lock.lock(this.dataFilePath, { retries: 3 }).then(release => {
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
