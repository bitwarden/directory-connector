import type { IpcRendererEvent } from "electron";

import type { GroupEntry } from "@/libs/models/groupEntry";
import type { UserEntry } from "@/libs/models/userEntry";

declare global {
  interface Window {
    ipc: {
      clipboard: {
        readText(type?: "selection" | "clipboard"): string;
        writeText(text: string, type?: "selection" | "clipboard"): void;
      };
      shell: {
        openExternal(url: string): Promise<void>;
      };
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>;
        on(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): void;
        removeListener(
          channel: string,
          listener: (event: IpcRendererEvent, ...args: any[]) => void,
        ): void;
        send(channel: string, ...args: any[]): void;
        sendSync(channel: string, ...args: any[]): any;
      };
      webUtils: {
        getPathForFile(file: File): string;
      };
      process: {
        platform: typeof process.platform;
        mas: boolean;
        windowsStore: boolean;
        execPath: string;
        env: {
          ELECTRON_IS_DEV: string | undefined;
          APPIMAGE: string | undefined;
          SNAP_USER_DATA: string | undefined;
          PORTABLE_EXECUTABLE_DIR: string | undefined;
        };
        defaultApp: boolean;
        resourcesPath: string;
        isDev: boolean;
      };
      auth: {
        checkTokens(): Promise<{ accessToken: string | null; organizationId: string | null }>;
        logIn(credentials: { clientId: string; clientSecret: string }): Promise<void>;
        logOut(): Promise<void>;
      };
      sync: {
        run(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]>;
      };
    };
  }
}
