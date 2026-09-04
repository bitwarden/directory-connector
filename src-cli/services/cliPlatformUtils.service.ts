import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { ClientType } from "@/libs/enums/clientType";
import { DeviceType } from "@/libs/enums/deviceType";

export class CliPlatformUtilsService implements PlatformUtilsService {
  clientType: ClientType;

  private deviceCache: DeviceType = null;

  constructor(
    clientType: ClientType,
    private packageJson: any,
  ) {
    this.clientType = clientType;
  }

  getDevice(): DeviceType {
    if (!this.deviceCache) {
      switch (process.platform) {
        case "win32":
          this.deviceCache = DeviceType.WindowsDesktop;
          break;
        case "darwin":
          this.deviceCache = DeviceType.MacOsDesktop;
          break;
        case "linux":
        default:
          this.deviceCache = DeviceType.LinuxDesktop;
          break;
      }
    }
    return this.deviceCache;
  }

  getDeviceString(): string {
    return DeviceType[this.getDevice()].toLowerCase().replace("desktop", "");
  }

  getClientType() {
    return this.clientType;
  }

  getApplicationVersion(): Promise<string> {
    return Promise.resolve(this.packageJson.version);
  }

  getApplicationVersionSync(): string {
    return this.packageJson.version;
  }

  isDev(): boolean {
    return process.env.BWCLI_ENV === "development";
  }

  showToast(): void {
    throw new Error("Not implemented.");
  }

  showDialog(): Promise<boolean> {
    throw new Error("Not implemented.");
  }
}
