import { PlatformUtilsService } from "../../abstractions/platformUtils.service";
import { DeviceType } from "../../enums/deviceType";

export class DeviceRequest {
  type: DeviceType;
  name: string;
  identifier: string;
  pushToken?: string;

  constructor(appId: string, platformUtilsService: PlatformUtilsService) {
    this.type = platformUtilsService.getDevice();
    this.name = platformUtilsService.getDeviceString();
    this.identifier = appId;
    this.pushToken = null;
  }
}
