import { LogService } from "@/libs/abstractions/log.service";
import { LogLevelType } from "@/libs/enums/logLevelType";
import { ConsoleLogService } from "@/libs/services/consoleLog.service";

export class RendererLogService extends ConsoleLogService implements LogService {
  write(level: LogLevelType, message: string) {
    super.write(level, message);
    ipc.log.write(level, message);
  }
}
