import { clipboard, contextBridge, IpcRendererEvent, ipcRenderer, shell, webUtils } from "electron";
import type { Jsonify } from "type-fest";

import type { ThemeType } from "@/libs/enums/themeType";
import type { GroupEntry } from "@/libs/models/groupEntry";
import type { UserEntry } from "@/libs/models/userEntry";

const ipcBridge = {
  clipboard: {
    readText: (type?: "selection" | "clipboard") => clipboard.readText(type),
    writeText: (text: string, type?: "selection" | "clipboard") => clipboard.writeText(text, type),
  },
  shell: {
    openExternal: (url: string) => shell.openExternal(url),
  },
  webUtils: {
    getPathForFile: (file: File) => webUtils.getPathForFile(file),
  },
  process: {
    platform: process.platform,
    mas: process.mas,
    windowsStore: (process as any).windowsStore,
    execPath: process.execPath,
    env: {
      ELECTRON_IS_DEV: process.env.ELECTRON_IS_DEV,
      APPIMAGE: process.env.APPIMAGE,
      SNAP_USER_DATA: process.env.SNAP_USER_DATA,
      PORTABLE_EXECUTABLE_DIR: process.env.PORTABLE_EXECUTABLE_DIR,
    },
    defaultApp: (process as any).defaultApp,
    resourcesPath: process.resourcesPath,
    isDev:
      process.env.ELECTRON_IS_DEV != null
        ? parseInt(process.env.ELECTRON_IS_DEV, 10) === 1
        : (process as any).defaultApp || /node_modules[\\/]electron[\\/]/.test(process.execPath),
  },
  platform: {
    getAppVersion: (): Promise<string> => ipcRenderer.invoke("appVersion"),
    showMessageBox: (opts: {
      type?: string;
      title?: string;
      message?: string;
      detail?: string;
      buttons?: string[];
      cancelId?: number;
      defaultId?: number;
      noLink?: boolean;
    }): Promise<{ response: number }> => ipcRenderer.invoke("showMessageBox", opts),
    authenticateBiometric: (): boolean =>
      ipcRenderer.sendSync("biometric", { action: "authenticate" }),
    getSystemTheme: (): Promise<ThemeType.Light | ThemeType.Dark> =>
      ipcRenderer.invoke("systemTheme"),
    onSystemThemeChange: (
      listener: (event: IpcRendererEvent, theme: ThemeType.Light | ThemeType.Dark) => void,
    ) => ipcRenderer.on("systemThemeUpdated", listener),
    openContextMenu: (menu: { label?: string; type?: string }[]): Promise<number> =>
      ipcRenderer.invoke("openContextMenu", { menu }),
    isWindowVisible: (): Promise<boolean> => ipcRenderer.invoke("windowVisible"),
  },
  messaging: {
    send: (message: { command: string; [key: string]: any }) =>
      ipcRenderer.send("messagingService", message),
    on: (
      listener: (event: IpcRendererEvent, message: { command: string; [key: string]: any }) => void,
    ) => ipcRenderer.on("messagingService", listener),
    removeListener: (
      listener: (event: IpcRendererEvent, message: { command: string; [key: string]: any }) => void,
    ) => ipcRenderer.removeListener("messagingService", listener),
  },
  storage: {
    get: <T>(key: string): Promise<T> =>
      ipcRenderer.invoke("storageService", { action: "get", key }),
    has: (key: string): Promise<boolean> =>
      ipcRenderer.invoke("storageService", { action: "has", key }),
    save: (key: string, obj: any): Promise<void> =>
      ipcRenderer.invoke("storageService", { action: "save", key, obj }),
    remove: (key: string): Promise<void> =>
      ipcRenderer.invoke("storageService", { action: "remove", key }),
  },
  secureStorage: {
    get: <T>(key: string): Promise<T> =>
      ipcRenderer.invoke("secureStorageService", { action: "get", key }),
    has: (key: string): Promise<boolean> =>
      ipcRenderer.invoke("secureStorageService", { action: "has", key }),
    save: (key: string, obj: any): Promise<void> =>
      ipcRenderer.invoke("secureStorageService", { action: "save", key, obj }),
    remove: (key: string): Promise<void> =>
      ipcRenderer.invoke("secureStorageService", { action: "remove", key }),
  },
  auth: {
    checkTokens: (): Promise<{ accessToken: string | null; organizationId: string | null }> =>
      ipcRenderer.invoke("auth:checkTokens"),
    logIn: (credentials: { clientId: string; clientSecret: string }): Promise<void> =>
      ipcRenderer.invoke("auth:login", credentials),
    logOut: (): Promise<void> => ipcRenderer.invoke("auth:logout"),
  },
  sync: {
    run: (
      force: boolean,
      test: boolean,
    ): Promise<[Jsonify<GroupEntry>[] | null, Jsonify<UserEntry>[] | null]> =>
      ipcRenderer.invoke("sync:run", { force, test }),
  },
};

export type IpcBridge = typeof ipcBridge;
export { ipcBridge };

contextBridge.exposeInMainWorld("ipc", ipcBridge);
