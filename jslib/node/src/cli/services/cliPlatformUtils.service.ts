import * as child_process from "child_process";

import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { ClientType } from "jslib-common/enums/clientType";
import { DeviceType } from "jslib-common/enums/deviceType";
import { ThemeType } from "jslib-common/enums/themeType";

// eslint-disable-next-line
const open = require("open");

export class CliPlatformUtilsService implements PlatformUtilsService {
  clientType: ClientType;

  private deviceCache: DeviceType = null;

  constructor(clientType: ClientType, private packageJson: any) {
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
    const device = DeviceType[this.getDevice()].toLowerCase();
    return device.replace("desktop", "");
  }

  getClientType() {
    return this.clientType;
  }

  isFirefox() {
    return false;
  }

  isChrome() {
    return false;
  }

  isEdge() {
    return false;
  }

  isOpera() {
    return false;
  }

  isVivaldi() {
    return false;
  }

  isSafari() {
    return false;
  }

  isMacAppStore() {
    return false;
  }

  isViewOpen() {
    return Promise.resolve(false);
  }

  launchUri(uri: string, options?: any): void {
    if (process.platform === "linux") {
      child_process.spawnSync("xdg-open", [uri]);
    } else {
      open(uri);
    }
  }

  saveFile(win: Window, blobData: any, blobOptions: any, fileName: string): void {
    throw new Error("Not implemented.");
  }

  getApplicationVersion(): Promise<string> {
    return Promise.resolve(this.packageJson.version);
  }

  getApplicationVersionSync(): string {
    return this.packageJson.version;
  }

  supportsWebAuthn(win: Window) {
    return false;
  }

  supportsDuo(): boolean {
    return false;
  }

  showToast(
    type: "error" | "success" | "warning" | "info",
    title: string,
    text: string | string[],
    options?: any
  ): void {
    throw new Error("Not implemented.");
  }

  showDialog(
    text: string,
    title?: string,
    confirmText?: string,
    cancelText?: string,
    type?: string
  ): Promise<boolean> {
    throw new Error("Not implemented.");
  }

  isDev(): boolean {
    return process.env.BWCLI_ENV === "development";
  }

  isSelfHost(): boolean {
    return false;
  }

  copyToClipboard(text: string, options?: any): void {
    throw new Error("Not implemented.");
  }

  readFromClipboard(options?: any): Promise<string> {
    throw new Error("Not implemented.");
  }

  supportsBiometric(): Promise<boolean> {
    return Promise.resolve(false);
  }

  authenticateBiometric(): Promise<boolean> {
    return Promise.resolve(false);
  }

  getDefaultSystemTheme() {
    return Promise.resolve(ThemeType.Light as ThemeType.Light | ThemeType.Dark);
  }

  onDefaultSystemThemeChange() {
    /* noop */
  }

  getEffectiveTheme() {
    return Promise.resolve(ThemeType.Light);
  }

  supportsSecureStorage(): boolean {
    return false;
  }
}
