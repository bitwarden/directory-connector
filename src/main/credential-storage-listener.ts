import { passwords } from "dc-native";
import { ipcMain } from "electron";

export class DCCredentialStorageListener {
  constructor(private serviceName: string) {}

  init() {
    ipcMain.on("nativeSecureStorage", async (event: any, message: any) => {
      try {
        let serviceName = this.serviceName;
        message.keySuffix = "_" + (message.keySuffix ?? "");
        if (message.keySuffix !== "_") {
          serviceName += message.keySuffix;
        }

        let val: string | boolean = null;
        if (message.action && message.key) {
          if (message.action === "getPassword") {
            val = await passwords.getPassword(serviceName, message.key);
          } else if (message.action === "hasPassword") {
            const result = await passwords.getPassword(serviceName, message.key);
            val = result != null;
          } else if (message.action === "setPassword" && message.value) {
            await passwords.setPassword(serviceName, message.key, message.value);
          } else if (message.action === "deletePassword") {
            await passwords.deletePassword(serviceName, message.key);
          }
        }
        event.returnValue = val;
      } catch {
        event.returnValue = null;
      }
    });
  }
}
