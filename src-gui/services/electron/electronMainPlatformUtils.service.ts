import { app } from "electron";

import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { ClientType } from "@/libs/enums/clientType";
import { DeviceType } from "@/libs/enums/deviceType";
import { ThemeType } from "@/libs/enums/themeType";

export class ElectronMainPlatformUtilsService implements PlatformUtilsService {
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
  isFirefox = (): boolean => false;
  isChrome = (): boolean => true;
  isEdge = (): boolean => false;
  isOpera = (): boolean => false;
  isVivaldi = (): boolean => false;
  isSafari = (): boolean => false;
  isMacAppStore = (): boolean => process.mas === true;
  isViewOpen = (): Promise<boolean> => Promise.resolve(false);
  launchUri = (_uri: string, _options?: any): void => {};
  saveFile = (_win: Window, _blobData: any, _blobOptions: any, _fileName: string): void => {};
  supportsWebAuthn = (_win: Window): boolean => false;
  supportsDuo = (): boolean => true;
  showToast = (
    _type: "error" | "success" | "warning" | "info",
    _title: string,
    _text: string | string[],
    _options?: any,
  ): void => {};
  showDialog = (
    _body: string,
    _title?: string,
    _confirmText?: string,
    _cancelText?: string,
    _type?: string,
    _bodyIsHtml?: boolean,
  ): Promise<boolean> => Promise.resolve(false);
  isDev = (): boolean => false;
  isSelfHost = (): boolean => false;
  copyToClipboard = (_text: string, _options?: any): void => {};
  readFromClipboard = (_options?: any): Promise<string> => Promise.resolve("");
  supportsBiometric = (): Promise<boolean> => Promise.resolve(false);
  authenticateBiometric = (): Promise<boolean> => Promise.resolve(false);
  getDefaultSystemTheme = (): Promise<ThemeType.Light | ThemeType.Dark> =>
    Promise.resolve(ThemeType.Light);
  onDefaultSystemThemeChange = (
    _callback: (theme: ThemeType.Light | ThemeType.Dark) => unknown,
  ): unknown => undefined;
  getEffectiveTheme = (): Promise<ThemeType> => Promise.resolve(ThemeType.Light);
  supportsSecureStorage = (): boolean => true;
}
