import { passwords } from "dc-native";

import { StorageService } from "@/libs/abstractions/storage.service";

export class NativeSecureStorageService implements StorageService {
  constructor(private serviceName: string) {}

  get<T>(key: string): Promise<T> {
    return passwords
      .getPassword(this.serviceName, key)
      .then((val: string) => JSON.parse(val) as T)
      .catch((e: Error): T => {
        if (e.message === passwords.PASSWORD_NOT_FOUND) {
          return null;
        }
        throw e;
      });
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) != null;
  }

  save(key: string, obj: any): Promise<any> {
    if (!obj) {
      return this.remove(key);
    }
    return passwords.setPassword(this.serviceName, key, JSON.stringify(obj));
  }

  remove(key: string): Promise<any> {
    return passwords.deletePassword(this.serviceName, key).catch((e: Error) => {
      if (e.message === passwords.PASSWORD_NOT_FOUND) {
        return;
      }
      throw e;
    });
  }
}
