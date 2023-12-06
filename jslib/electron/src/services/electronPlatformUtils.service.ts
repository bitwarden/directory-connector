import { clipboard, ipcRenderer, shell } from "electron";

import { isDev, isMacAppStore } from "../utils";

import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { MessagingService } from "@/jslib/common/src/abstractions/messaging.service";
import { PlatformUtilsService } from "@/jslib/common/src/abstractions/platformUtils.service";
import { StateService } from "@/jslib/common/src/abstractions/state.service";
import { ClientType } from "@/jslib/common/src/enums/clientType";
import { DeviceType } from "@/jslib/common/src/enums/deviceType";
import { ThemeType } from "@/jslib/common/src/enums/themeType";


export class ElectronPlatformUtilsService implements PlatformUtilsService {
  private clientType: ClientType;
  private deviceCache: DeviceType = null;

  constructor(
    protected i18nService: I18nService,
    private messagingService: MessagingService,
    private isDesktopApp: boolean,
    private stateService: StateService
  ) {
    this.clientType = isDesktopApp ? ClientType.Desktop : ClientType.DirectoryConnector;
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
    const device = DeviceType[this.getDevice()].toLowerCase();
    return device.replace("desktop", "");
  }

  getClientType() {
    return this.clientType;
  }

  isFirefox(): boolean {
    return false;
  }

  isChrome(): boolean {
    return true;
  }

  isEdge(): boolean {
    return false;
  }

  isOpera(): boolean {
    return false;
  }

  isVivaldi(): boolean {
    return false;
  }

  isSafari(): boolean {
    return false;
  }

  isMacAppStore(): boolean {
    return isMacAppStore();
  }

  isViewOpen(): Promise<boolean> {
    return Promise.resolve(false);
  }

  launchUri(uri: string, options?: any): void {
    shell.openExternal(uri);
  }

  saveFile(win: Window, blobData: any, blobOptions: any, fileName: string): void {
    const blob = new Blob([blobData], blobOptions);
    const a = win.document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    win.document.body.appendChild(a);
    a.click();
    win.document.body.removeChild(a);
  }

  getApplicationVersion(): Promise<string> {
    return ipcRenderer.invoke("appVersion");
  }

  // Temporarily restricted to only Windows until https://github.com/electron/electron/pull/28349
  // has been merged and an updated electron build is available.
  supportsWebAuthn(win: Window): boolean {
    return process.platform === "win32";
  }

  supportsDuo(): boolean {
    return true;
  }

  showToast(
    type: "error" | "success" | "warning" | "info",
    title: string,
    text: string | string[],
    options?: any
  ): void {
    this.messagingService.send("showToast", {
      text: text,
      title: title,
      type: type,
      options: options,
    });
  }

  async showDialog(
    text: string,
    title?: string,
    confirmText?: string,
    cancelText?: string,
    type?: string
  ): Promise<boolean> {
    const buttons = [confirmText == null ? this.i18nService.t("ok") : confirmText];
    if (cancelText != null) {
      buttons.push(cancelText);
    }

    const result = await ipcRenderer.invoke("showMessageBox", {
      type: type,
      title: title,
      message: title,
      detail: text,
      buttons: buttons,
      cancelId: buttons.length === 2 ? 1 : null,
      defaultId: 0,
      noLink: true,
    });

    return Promise.resolve(result.response === 0);
  }

  isDev(): boolean {
    return isDev();
  }

  isSelfHost(): boolean {
    return false;
  }

  copyToClipboard(text: string, options?: any): void {
    const type = options ? options.type : null;
    const clearing = options ? !!options.clearing : false;
    const clearMs: number = options && options.clearMs ? options.clearMs : null;
    clipboard.writeText(text, type);
    if (!clearing) {
      this.messagingService.send("copiedToClipboard", {
        clipboardValue: text,
        clearMs: clearMs,
        type: type,
        clearing: clearing,
      });
    }
  }

  readFromClipboard(options?: any): Promise<string> {
    const type = options ? options.type : null;
    return Promise.resolve(clipboard.readText(type));
  }

  async supportsBiometric(): Promise<boolean> {
    return await this.stateService.getEnableBiometric();
  }

  authenticateBiometric(): Promise<boolean> {
    return new Promise((resolve) => {
      const val = ipcRenderer.sendSync("biometric", {
        action: "authenticate",
      });
      resolve(val);
    });
  }

  getDefaultSystemTheme() {
    return ipcRenderer.invoke("systemTheme");
  }

  onDefaultSystemThemeChange(callback: (theme: ThemeType.Light | ThemeType.Dark) => unknown) {
    ipcRenderer.on("systemThemeUpdated", (event, theme: ThemeType.Light | ThemeType.Dark) =>
      callback(theme)
    );
  }

  async getEffectiveTheme() {
    const theme = await this.stateService.getTheme();
    if (theme == null || theme === ThemeType.System) {
      return this.getDefaultSystemTheme();
    } else {
      return theme;
    }
  }

  supportsSecureStorage(): boolean {
    return true;
  }
}
