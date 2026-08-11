import { clipboard, contextBridge, IpcRendererEvent, ipcRenderer, shell, webUtils } from "electron";

const ALLOWED_CHANNELS = new Set([
  "appVersion",
  "biometric",
  "messagingService",
  "openContextMenu",
  "secureStorageService",
  "showMessageBox",
  "storageService",
  "systemTheme",
  "systemThemeUpdated",
  "windowVisible",
]);

contextBridge.exposeInMainWorld("ipc", {
  clipboard: {
    readText: (type?: "selection" | "clipboard") => clipboard.readText(type),
    writeText: (text: string, type?: "selection" | "clipboard") => clipboard.writeText(text, type),
  },
  shell: {
    openExternal: (url: string) => shell.openExternal(url),
  },
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => {
      if (!ALLOWED_CHANNELS.has(channel)) {
        throw new Error(`IPC channel not allowed: ${channel}`);
      }
      return ipcRenderer.invoke(channel, ...args);
    },
    on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => {
      if (!ALLOWED_CHANNELS.has(channel)) {
        throw new Error(`IPC channel not allowed: ${channel}`);
      }
      ipcRenderer.on(channel, listener);
    },
    removeListener: (
      channel: string,
      listener: (event: IpcRendererEvent, ...args: any[]) => void,
    ) => {
      if (!ALLOWED_CHANNELS.has(channel)) {
        throw new Error(`IPC channel not allowed: ${channel}`);
      }
      ipcRenderer.removeListener(channel, listener);
    },
    send: (channel: string, ...args: any[]) => {
      if (!ALLOWED_CHANNELS.has(channel)) {
        throw new Error(`IPC channel not allowed: ${channel}`);
      }
      ipcRenderer.send(channel, ...args);
    },
    sendSync: (channel: string, ...args: any[]) => {
      if (!ALLOWED_CHANNELS.has(channel)) {
        throw new Error(`IPC channel not allowed: ${channel}`);
      }
      return ipcRenderer.sendSync(channel, ...args);
    },
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
  auth: {
    checkTokens: (): Promise<{ accessToken: string | null; organizationId: string | null }> =>
      ipcRenderer.invoke("auth:checkTokens"),
    logIn: (credentials: { clientId: string; clientSecret: string }) =>
      ipcRenderer.invoke("auth:login", credentials),
    logOut: () => ipcRenderer.invoke("auth:logout"),
  },
  sync: {
    run: (force: boolean, test: boolean) => ipcRenderer.invoke("sync:run", { force, test }),
  },
});
