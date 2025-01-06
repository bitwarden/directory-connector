import { DirectoryType } from "@/src/enums/directoryType";
import { IDirectoryService } from "@/src/services/directory.service";

import { I18nService } from "./i18n.service";
import { LogService } from "./log.service";
import { StateService } from "./state.service";

export abstract class DirectoryFactoryAbstraction {
  abstract createService(
    type: DirectoryType,
    logService: LogService,
    i18nService: I18nService,
    stateService: StateService,
  ): IDirectoryService;
}
