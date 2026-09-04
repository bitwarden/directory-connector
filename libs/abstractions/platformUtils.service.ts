import { ClientType } from "@/libs/enums/clientType";
import { DeviceType } from "@/libs/enums/deviceType";

interface ToastOptions {
  timeout?: number;
}

export abstract class PlatformUtilsService {
  getDevice: () => DeviceType;
  getDeviceString: () => string;
  getClientType: () => ClientType;
  getApplicationVersion: () => Promise<string>;
  isDev: () => boolean;
  showToast: (
    type: "error" | "success" | "warning" | "info",
    title: string,
    text: string | string[],
    options?: ToastOptions,
  ) => void;
  showDialog: (
    body: string,
    title?: string,
    confirmText?: string,
    cancelText?: string,
    type?: string,
  ) => Promise<boolean>;
}
