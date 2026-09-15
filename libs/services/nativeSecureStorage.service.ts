import { LogService } from "@/libs/abstractions/log.service";
import { StorageService } from "@/libs/abstractions/storage.service";

import { SecureStorageKey, StorageKey } from "../models/state.model";

import { passwords } from "dc-native";

export class NativeSecureStorageService implements StorageService {
  constructor(
    private serviceName: string,
    private logService: LogService,
  ) {}

  async get<T>(key: StorageKey | SecureStorageKey): Promise<T> {
    return passwords
      .getPassword(this.serviceName, key)
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

  async has(key: StorageKey | SecureStorageKey): Promise<boolean> {
    return (await this.get(key)) != null;
  }

  async save(key: StorageKey | SecureStorageKey, obj: any): Promise<any> {
    if (obj == null) {
      return this.remove(key);
    }
    return passwords.setPassword(this.serviceName, key, JSON.stringify(obj)).catch((e: Error) => {
      throw this.describeWriteFailure("save", key, e);
    });
  }

  async remove(key: StorageKey | SecureStorageKey): Promise<any> {
    return passwords.deletePassword(this.serviceName, key).catch((e: Error) => {
      if (e.message === passwords.PASSWORD_NOT_FOUND) {
        return;
      }
      throw this.describeWriteFailure("remove", key, e);
    });
  }

  /**
   * Turns a secure storage write failure into an error the user can act on.
   *
   * On macOS an entry created by an older version of the app carries a keychain ACL that no
   * longer trusts this process, and any attempt to modify or delete it fails with
   * errSecInvalidOwnerEdit. The underlying error only reaches us as a localized,
   * code-free message, so it cannot be identified reliably — every non-"not found" write failure
   * therefore gets the recovery instructions. The original message is appended for diagnostics.
   *
   * Only the key name is included; the value being written is never logged or surfaced.
   */
  private describeWriteFailure(
    operation: string,
    key: StorageKey | SecureStorageKey,
    e: Error,
  ): Error {
    this.logService.warning(
      `NativeSecureStorageService: failed to ${operation} secure storage key "${key}": ${e.message}`,
    );

    return new Error(
      `Unable to update the stored credential "${key}". If it was created by an earlier version ` +
        `of this app it can no longer be modified: open Keychain Access, search for ` +
        `"${this.serviceName}", delete the matching entries, then restart the app and re-enter ` +
        `your directory credentials. (${e.message})`,
    );
  }
}
