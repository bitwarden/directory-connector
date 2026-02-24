
import { StorageService } from "@/jslib/common/src/abstractions/storage.service";
import { StorageOptions } from "@/jslib/common/src/models/domain/storageOptions";

import { passwords } from "dc-native";

const APPLICATION_NAME = "Bitwarden Directory Connector";

export class ElectronRendererSecureStorageService implements StorageService {
  async get<T>(key: string, options?: StorageOptions): Promise<T> {
    return passwords
      .getPassword(this.buildServiceName(options), key)
      .then((val: string) => JSON.parse(val) as T)
      .catch((e: Error): T => {
        if (e.message === passwords.PASSWORD_NOT_FOUND) {
          return null;
        }
        throw e;
      });
  }

  async has(key: string, options?: StorageOptions): Promise<boolean> {
    return (await this.get(key, options)) != null;
  }

  async save(key: string, obj: any, options?: StorageOptions): Promise<any> {
    if (!obj) {
      return this.remove(key, options);
    }
    return passwords.setPassword(
      this.buildServiceName(options),
      key,
      JSON.stringify(obj),
    );
  }

  async remove(key: string, options?: StorageOptions): Promise<any> {
    return passwords.deletePassword(this.buildServiceName(options), key).catch((e: Error) => {
      if (e.message === passwords.PASSWORD_NOT_FOUND) {
        return;
      }
      throw e;
    });
  }

  private buildServiceName(options?: StorageOptions): string {
    const suffix = options?.keySuffix;
    if (suffix) {
      return `${APPLICATION_NAME}_${suffix}`;
    }
    return APPLICATION_NAME;
  }
}
