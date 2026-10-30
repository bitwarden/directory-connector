import { I18nService } from "@/libs/abstractions/i18n.service";
import { MessagingService } from "@/libs/abstractions/messaging.service";
import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { ClientType } from "@/libs/enums/clientType";
import { DeviceType } from "@/libs/enums/deviceType";

export class RendererPlatformUtilsService implements PlatformUtilsService {
  private deviceCache: DeviceType = null;

  constructor(
    protected i18nService: I18nService,
    private messagingService: MessagingService,
  ) {}

  getDevice(): DeviceType {
    if (!this.deviceCache) {
      switch (ipc.process.platform) {
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
    return ClientType.DirectoryConnector;
  }

  getApplicationVersion(): Promise<string> {
    return ipc.platform.getAppVersion();
  }

  isDev(): boolean {
    return ipc.process.isDev;
  }

  showToast(
    type: "error" | "success" | "warning" | "info",
    title: string,
    text: string | string[],
    options?: any,
  ): void {
    this.messagingService.send("showToast", { text, title, type, options });
  }

  async showDialog(
    text: string,
    title?: string,
    confirmText?: string,
    cancelText?: string,
    type?: string,
  ): Promise<boolean> {
    const buttons = [confirmText ?? this.i18nService.t("ok")];
    if (cancelText != null) {
      buttons.push(cancelText);
    }
    const result = await ipc.platform.showMessageBox({
      type,
      title,
      message: title,
      detail: text,
      buttons,
      cancelId: buttons.length === 2 ? 1 : null,
      defaultId: 0,
      noLink: true,
    });
    return result.response === 0;
  }
}
