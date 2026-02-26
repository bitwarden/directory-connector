import { ipcMain } from "electron";
import { deletePassword, getPassword, setPassword } from "keytar";

export class DCCredentialStorageListener {
  constructor(private serviceName: string) {}

  init() {
    ipcMain.on("keytar", async (event: any, message: any) => {
      try {
        let serviceName = this.serviceName;
        message.keySuffix = "_" + (message.keySuffix ?? "");
        if (message.keySuffix !== "_") {
          serviceName += message.keySuffix;
        }

        let val: string | boolean = null;
        if (message.action && message.key) {
          if (message.action === "getPassword") {
            val = await getPassword(serviceName, message.key);
          } else if (message.action === "hasPassword") {
            const result = await getPassword(serviceName, message.key);
            val = result != null;
          } else if (message.action === "setPassword" && message.value) {
            await setPassword(serviceName, message.key, message.value);
          } else if (message.action === "deletePassword") {
            await deletePassword(serviceName, message.key);
          }
        }
        event.returnValue = val;
      } catch {
        event.returnValue = null;
      }
    });
  }
}
