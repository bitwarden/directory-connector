import { StorageService } from "@/jslib/common/src/abstractions/storage.service";

import { passwords } from "dc-native";


export class NativeSecureStorageService implements StorageService {
  constructor(private serviceName: string) {}

  get<T>(key: string): Promise<T> {
    return passwords.getPassword(this.serviceName, key).then((val: string) => {
      return JSON.parse(val) as T;
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
    return passwords.deletePassword(this.serviceName, key);
  }
}
