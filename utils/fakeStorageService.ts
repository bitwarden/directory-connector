import { StorageService } from "@/libs/abstractions/storage.service";

/**
 * In-memory StorageService for use in unit tests.
 * Allows round-trip tests and direct store introspection via `.store`.
 */
export class FakeStorageService implements StorageService {
  readonly store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T> {
    return (this.store.get(key) as T) ?? null;
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async save(key: string, obj: unknown): Promise<void> {
    this.store.set(key, obj);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }
}
