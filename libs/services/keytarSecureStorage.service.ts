import { deletePassword, getPassword, setPassword } from "keytar";

import { StorageService } from "@/jslib/common/src/abstractions/storage.service";

export class KeytarSecureStorageService implements StorageService {
  constructor(private serviceName: string) {}

  get<T>(key: string): Promise<T> {
    return getPassword(this.serviceName, key).then((val) => {
      return JSON.parse(val) as T;
    });
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) != null;
  }

  save(key: string, obj: any): Promise<any> {
    // keytar throws if you try to save a falsy value: https://github.com/atom/node-keytar/issues/86
    // handle this by removing the key instead
    if (!obj) {
      return this.remove(key);
    }

    return setPassword(this.serviceName, key, JSON.stringify(obj));
  }

  remove(key: string): Promise<any> {
    return deletePassword(this.serviceName, key);
  }
}
