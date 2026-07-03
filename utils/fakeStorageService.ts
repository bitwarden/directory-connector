import { StorageService } from "@/libs/abstractions/storage.service";
import { SecureStorageKey, StorageKey } from "@/libs/models/state.model";

/**
 * In-memory StorageService for use in unit tests.
 * Allows round-trip tests and direct store introspection via `.store`.
 */
export class FakeStorageService implements StorageService {
  readonly store = new Map<string, unknown>();

  async get<T>(key: StorageKey | SecureStorageKey): Promise<T> {
    return (this.store.get(key) as T) ?? null;
  }

  async has(key: StorageKey | SecureStorageKey): Promise<boolean> {
    return this.store.has(key);
  }

  async save(key: StorageKey | SecureStorageKey, obj: unknown): Promise<void> {
    this.store.set(key, obj);
  }

  async remove(key: StorageKey | SecureStorageKey): Promise<void> {
    this.store.delete(key);
  }
}
