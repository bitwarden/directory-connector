import * as path from "path";

import log from "electron-log";

import { LogLevelType } from "jslib-common/enums/logLevelType";
import { ConsoleLogService as BaseLogService } from "jslib-common/services/consoleLog.service";

import { isDev } from "../utils";

export class ElectronLogService extends BaseLogService {
  constructor(protected filter: (level: LogLevelType) => boolean = null, logDir: string = null) {
    super(isDev(), filter);
    if (log.transports == null) {
      return;
    }

    log.transports.file.level = "info";
    if (logDir != null) {
      log.transports.file.file = path.join(logDir, "app.log");
    }
  }

  write(level: LogLevelType, message: string) {
    if (this.filter != null && this.filter(level)) {
      return;
    }

    switch (level) {
      case LogLevelType.Debug:
        log.debug(message);
        break;
      case LogLevelType.Info:
        log.info(message);
        break;
      case LogLevelType.Warning:
        log.warn(message);
        break;
      case LogLevelType.Error:
        log.error(message);
        break;
      default:
        break;
    }
  }
}
