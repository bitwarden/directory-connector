import { DirectoryType } from "@/src/enums/directoryType";
import { IDirectoryService } from "@/src/services/directory.service";

export abstract class DirectoryFactoryService {
  abstract createService(type: DirectoryType): IDirectoryService;
}
