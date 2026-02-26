import { DirectoryType } from "@/libs/enums/directoryType";
import { IDirectoryService } from "@/libs/services/directory-services/directory.service";

export abstract class DirectoryFactoryService {
  abstract createService(type: DirectoryType): IDirectoryService;
}
