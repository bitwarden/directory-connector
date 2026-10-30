import { app } from "electron";

import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { ClientType } from "@/libs/enums/clientType";
import { DeviceType } from "@/libs/enums/deviceType";

export class MainPlatformUtilsService implements PlatformUtilsService {
  getDevice = (): DeviceType => {
    switch (process.platform) {
      case "win32":
        return DeviceType.WindowsDesktop;
      case "darwin":
        return DeviceType.MacOsDesktop;
      default:
        return DeviceType.LinuxDesktop;
    }
  };

  getDeviceString = (): string => DeviceType[this.getDevice()].toLowerCase().replace("desktop", "");
  getClientType = (): ClientType => ClientType.DirectoryConnector;
  getApplicationVersion = (): Promise<string> => Promise.resolve(app.getVersion());
  isDev = (): boolean => false;
  showToast = (): void => {};
  showDialog = (): Promise<boolean> => Promise.resolve(false);
}
