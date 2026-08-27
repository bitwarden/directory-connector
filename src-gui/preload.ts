import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { Jsonify } from "type-fest";

import type { GroupEntry } from "@/libs/models/groupEntry";
import type { UserEntry } from "@/libs/models/userEntry";

const ipcBridge = {
  webUtils: {
    getPathForFile: (file: File) => webUtils.getPathForFile(file),
  },
  process: {
    platform: process.platform,
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
  },
  log: {
    write: (level: number, message: string) => ipcRenderer.send("log", { level, message }),
  },
  messaging: {
    send: (message: { command: string; [key: string]: any }) =>
      ipcRenderer.send("messagingService", message),
    on: (listener: (message: { command: string; [key: string]: any }) => void) =>
      ipcRenderer.on("messagingService", (_event, message) => listener(message)),
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
