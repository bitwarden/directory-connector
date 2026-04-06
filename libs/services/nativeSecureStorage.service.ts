
import { StorageService } from "@/libs/abstractions/storage.service";

import { SecureStorageKey, StorageKey } from "../models/state.model";

import { passwords } from "dc-native";

export class NativeSecureStorageService implements StorageService {
  constructor(private serviceName: string) {}

  async get<T>(key: StorageKey | SecureStorageKey): Promise<T> {
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

  async has(key: StorageKey | SecureStorageKey): Promise<boolean> {
    return (await this.get(key)) != null;
  }

  async save(key: StorageKey | SecureStorageKey, obj: any): Promise<any> {
    if (!obj) {
      return this.remove(key);
    }
    return passwords.setPassword(this.serviceName, key, JSON.stringify(obj));
  }

  async remove(key: StorageKey | SecureStorageKey): Promise<any> {
    return passwords.deletePassword(this.serviceName, key).catch((e: Error) => {
      if (e.message === passwords.PASSWORD_NOT_FOUND) {
        return;
      }
      throw e;
    });
  }
}
