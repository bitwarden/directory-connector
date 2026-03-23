import { AppIdService as AppIdServiceAbstraction } from "@/libs/abstractions/appId.service";
import { StorageService } from "@/libs/abstractions/storage.service";
import { HtmlStorageLocation } from "@/libs/enums/htmlStorageLocation";
import { StorageKey } from "@/libs/models/state.model";
import { Utils } from "@/libs/utils/utils";

export class AppIdService implements AppIdServiceAbstraction {
  constructor(private storageService: StorageService) {}

  getAppId(): Promise<string> {
    return this.makeAndGetAppId("appId");
  }

  getAnonymousAppId(): Promise<string> {
    return this.makeAndGetAppId("anonymousAppId");
  }

  private async makeAndGetAppId(key: StorageKey) {
    const existingId = await this.storageService.get<string>(key, {
      htmlStorageLocation: HtmlStorageLocation.Local,
    });
    if (existingId != null) {
      return existingId;
    }

    const guid = Utils.newGuid();
    await this.storageService.save(key, guid, {
      htmlStorageLocation: HtmlStorageLocation.Local,
    });
    return guid;
  }
}
