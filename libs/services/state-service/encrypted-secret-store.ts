import { LogService } from "@/libs/abstractions/log.service";
import { StorageService } from "@/libs/abstractions/storage.service";
import {
  SecureStorageKey,
  SecureStorageKeys,
  StorageKey,
  StorageKeys,
} from "@/libs/models/state.model";

import {
  decryptSecret,
  encryptSecret,
  generateSecretEncryptionKey,
} from "./secret-encryption.util";
import { scopedSecureStorageKey } from "./secret-storage-key.util";

export interface EncryptedSecretStoreKeys {
  /** Regular storage key holding the encrypted secret. */
  encryptedSecret: StorageKey;
  /** Secure storage key holding the encryption key, scoped to the configuration's id. */
  encryptionKey: SecureStorageKey;
  /**
   * Secure storage key the secret itself was kept under before it was encrypted. Read as a
   * fallback until the secret is next saved (or migrated), then removed.
   */
  legacySecret: SecureStorageKey;
}

/**
 * Stores a secret encrypted on disk, with its encryption key in OS secure storage, for secrets
 * too large for secure storage itself. See secret-encryption.util.ts.
 *
 * The encrypted secret lives in data.json alongside the configuration it belongs to, while the
 * key is scoped to that configuration's id (see secret-storage-key.util.ts). Copying data.json to
 * another machine therefore carries the encrypted secret but not the key, so the secret has to be
 * re-entered there - the same as when the secret itself lived in secure storage.
 */
export class EncryptedSecretStore {
  constructor(
    private storageService: StorageService,
    private secureStorageService: StorageService,
    private logService: LogService,
    private keys: EncryptedSecretStoreKeys,
  ) {}

  /**
   * Returns the secret, or null if none is stored or it cannot be decrypted. Falls back to the
   * legacy unencrypted secret if the secret has not been encrypted yet.
   */
  async get(id: string | null | undefined): Promise<string | null> {
    const encrypted = await this.storageService.get<string>(this.keys.encryptedSecret);
    if (encrypted == null) {
      return await this.getLegacySecret(id);
    }

    const key = await this.secureStorageService.get<string>(this.encryptionKeyName(id));
    if (key == null) {
      // Expected when data.json was copied from another machine or secure storage was reset.
      this.logService.warning(
        `EncryptedSecretStore: no encryption key found for "${this.keys.encryptedSecret}"; the secret must be re-entered.`,
      );
      return null;
    }

    try {
      return await decryptSecret(encrypted, key);
    } catch (e) {
      // Don't try to recover: a key and secret that are out of sync should be visible in logs.
      this.logService.error(
        `EncryptedSecretStore: failed to decrypt "${this.keys.encryptedSecret}": ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      return null;
    }
  }

  /** Encrypts and stores the secret, or clears it when `value` is null. */
  async set(id: string | null | undefined, value: string | null): Promise<void> {
    if (value == null) {
      await this.clear(id);
      return;
    }

    const key = await this.getOrCreateEncryptionKey(id);
    await this.storageService.save(this.keys.encryptedSecret, await encryptSecret(value, key));
    // Only removed once the encrypted copy is saved, so an interrupted save loses nothing.
    // Best-effort: reads prefer the encrypted copy, so a leftover legacy secret is never used, and
    // failing here would block the save (e.g. macOS keychain items owned by the old renderer
    // process cannot be deleted by main - errSecInvalidOwnerEdit).
    try {
      await this.removeLegacySecret(id);
    } catch (e) {
      this.logService.warning(
        `EncryptedSecretStore: could not remove legacy secret for "${this.keys.encryptedSecret}": ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }

  /** Removes the encrypted secret, its encryption key and any legacy unencrypted secret. */
  async clear(id: string | null | undefined): Promise<void> {
    await this.storageService.remove(this.keys.encryptedSecret);
    await this.secureStorageService.remove(this.encryptionKeyName(id));
    await this.removeLegacySecret(id);
  }

  /**
   * Encrypts a secret still stored the legacy way. Returns true if a secret was migrated, false
   * if there was nothing to migrate.
   */
  async migrateLegacySecret(id: string | null | undefined): Promise<boolean> {
    if ((await this.storageService.get<string>(this.keys.encryptedSecret)) != null) {
      return false;
    }
    const legacy = await this.getLegacySecret(id);
    if (legacy == null) {
      return false;
    }
    await this.set(id, legacy);
    return true;
  }

  private encryptionKeyName(id: string | null | undefined): SecureStorageKey {
    return id != null
      ? scopedSecureStorageKey(this.keys.encryptionKey, id)
      : this.keys.encryptionKey;
  }

  private async getOrCreateEncryptionKey(id: string | null | undefined): Promise<string> {
    const name = this.encryptionKeyName(id);
    const existing = await this.secureStorageService.get<string>(name);
    if (existing != null) {
      return existing;
    }

    const key = generateSecretEncryptionKey();
    await this.secureStorageService.save(name, key);

    // Auth saw keys intermittently fail to persist in Windows Credential Manager, so confirm the
    // key reads back before encrypting anything with it.
    if ((await this.secureStorageService.get<string>(name)) !== key) {
      throw new Error("New secret encryption key could not be read back from secure storage.");
    }
    return key;
  }

  private async getLegacySecret(id: string | null | undefined): Promise<string | null> {
    if (id != null) {
      const scoped = await this.secureStorageService.get<string>(
        scopedSecureStorageKey(this.keys.legacySecret, id),
      );
      if (scoped != null) {
        return scoped;
      }
    }
    return await this.secureStorageService.get<string>(this.keys.legacySecret);
  }

  private async removeLegacySecret(id: string | null | undefined): Promise<void> {
    if (id != null) {
      await this.secureStorageService.remove(scopedSecureStorageKey(this.keys.legacySecret, id));
    }
    await this.secureStorageService.remove(this.keys.legacySecret);
  }
}

/** Creates the store for the Google Workspace private key. */
export function createGsuiteSecretStore(
  storageService: StorageService,
  secureStorageService: StorageService,
  logService: LogService,
): EncryptedSecretStore {
  return new EncryptedSecretStore(storageService, secureStorageService, logService, {
    encryptedSecret: StorageKeys.directoryGsuiteEncryptedPrivateKey,
    encryptionKey: SecureStorageKeys.gsuiteEncryptionKey,
    legacySecret: SecureStorageKeys.gsuite,
  });
}
