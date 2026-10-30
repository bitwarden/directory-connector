import { LogService } from "@/libs/abstractions/log.service";
import { SecureStorageService } from "@/libs/abstractions/storage.service";

import { SecureStorageKey, StorageKey } from "../models/state.model";

import { passwords } from "dc-native";

export class NativeSecureStorageService implements SecureStorageService {
  constructor(
    private serviceName: string,
    private logService: LogService,
  ) {}

  async get<T>(key: StorageKey | SecureStorageKey): Promise<T> {
    return this.parse<T>(key, passwords.getPassword(this.serviceName, key));
  }

  async getVNext<T>(key: SecureStorageKey): Promise<T> {
    return this.parse<T>(key, passwords.getPasswordVNext(this.serviceName, key));
  }

  async has(key: StorageKey | SecureStorageKey): Promise<boolean> {
    return (await this.get(key)) != null;
  }

  async save(key: StorageKey | SecureStorageKey, obj: any): Promise<any> {
    if (obj == null) {
      return this.remove(key);
    }
    return passwords.setPassword(this.serviceName, key, JSON.stringify(obj));
  }

  async saveVNext(key: SecureStorageKey, obj: any): Promise<any> {
    if (obj == null) {
      return this.remove(key);
    }
    return passwords.setPasswordVNext(this.serviceName, key, JSON.stringify(obj));
  }

  async remove(key: StorageKey | SecureStorageKey): Promise<any> {
    return passwords.deletePassword(this.serviceName, key).catch((e: Error) => {
      if (e.message === passwords.PASSWORD_NOT_FOUND) {
        return;
      }
      throw e;
    });
  }

  private parse<T>(key: StorageKey | SecureStorageKey, password: Promise<string>): Promise<T> {
    return password
      .then((val: string) => {
        try {
          return JSON.parse(val) as T;
        } catch {
          this.logService.warning(
            `NativeSecureStorageService: failed to parse stored value for key "${key}"`,
          );
          return null;
        }
      })
      .catch((e: Error): T => {
        if (e.message === passwords.PASSWORD_NOT_FOUND) {
          return null;
        }
        throw e;
      });
  }
}
