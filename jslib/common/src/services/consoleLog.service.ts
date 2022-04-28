import * as hrtime from "browser-hrtime";

import { LogService as LogServiceAbstraction } from "../abstractions/log.service";
import { LogLevelType } from "../enums/logLevelType";

export class ConsoleLogService implements LogServiceAbstraction {
  protected timersMap: Map<string, [number, number]> = new Map();

  constructor(
    protected isDev: boolean,
    protected filter: (level: LogLevelType) => boolean = null
  ) {}

  debug(message: string) {
    if (!this.isDev) {
      return;
    }
    this.write(LogLevelType.Debug, message);
  }

  info(message: string) {
    this.write(LogLevelType.Info, message);
  }

  warning(message: string) {
    this.write(LogLevelType.Warning, message);
  }

  error(message: string) {
    this.write(LogLevelType.Error, message);
  }

  write(level: LogLevelType, message: string) {
    if (this.filter != null && this.filter(level)) {
      return;
    }

    switch (level) {
      case LogLevelType.Debug:
        // eslint-disable-next-line
        console.log(message);
        break;
      case LogLevelType.Info:
        // eslint-disable-next-line
        console.log(message);
        break;
      case LogLevelType.Warning:
        // eslint-disable-next-line
        console.warn(message);
        break;
      case LogLevelType.Error:
        // eslint-disable-next-line
        console.error(message);
        break;
      default:
        break;
    }
  }

  time(label = "default") {
    if (!this.timersMap.has(label)) {
      this.timersMap.set(label, hrtime());
    }
  }

  timeEnd(label = "default"): [number, number] {
    const elapsed = hrtime(this.timersMap.get(label));
    this.timersMap.delete(label);
    this.write(LogLevelType.Info, `${label}: ${elapsed[0] * 1000 + elapsed[1] / 10e6}ms`);
    return elapsed;
  }
}
