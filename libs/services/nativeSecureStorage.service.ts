import { LogService } from "@/libs/abstractions/log.service";
import { StorageService } from "@/libs/abstractions/storage.service";

import { SecureStorageKey, StorageKey } from "../models/state.model";

import { passwords } from "dc-native";

/**
 * Windows Credential Manager rejects any credential blob larger than 2560 bytes
 * (CRED_MAX_CREDENTIAL_BLOB_SIZE), and desktop_core writes blobs as UTF-16 sized at
 * `utf8ByteLength * 2`. That caps a single entry at 1280 UTF-8 bytes - smaller than a typical
 * Google Workspace service account private key. Values above this budget are split across
 * multiple entries. A margin is kept below the hard limit.
 */
export const MAX_SECRET_CHUNK_BYTES = 1024;

/** Stored under the primary key in place of the value when the value has been chunked. */
interface ChunkManifest {
  dcChunkedSecret: true;
  chunks: number;
}

function isChunkManifest(value: unknown): value is ChunkManifest {
  return (
    value != null &&
    typeof value === "object" &&
    (value as ChunkManifest).dcChunkedSecret === true &&
    Number.isInteger((value as ChunkManifest).chunks)
  );
}

function utf8ByteLength(codePoint: number): number {
  if (codePoint < 0x80) {
    return 1;
  }
  if (codePoint < 0x800) {
    return 2;
  }
  if (codePoint < 0x10000) {
    return 3;
  }
  return 4;
}

/** Splits a string into chunks of at most `maxBytes` UTF-8 bytes without splitting a code point. */
function splitIntoChunks(value: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of value) {
    const bytes = utf8ByteLength(char.codePointAt(0));
    if (currentBytes + bytes > maxBytes) {
      chunks.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  chunks.push(current);
  return chunks;
}

export class NativeSecureStorageService implements StorageService {
  constructor(
    private serviceName: string,
    private logService: LogService,
  ) {}

  async get<T>(key: StorageKey | SecureStorageKey): Promise<T> {
    const raw = await this.getRaw(key);
    if (raw == null) {
      return null;
    }

    const parsed = this.parse<unknown>(key, raw);
    if (!isChunkManifest(parsed)) {
      return parsed as T;
    }

    let joined = "";
    for (let i = 0; i < parsed.chunks; i++) {
      const chunk = await this.getRaw(this.chunkKey(key, i));
      if (chunk == null) {
        this.logService.warning(
          `NativeSecureStorageService: missing chunk ${i} of ${parsed.chunks} for key "${key}"`,
        );
        return null;
      }
      joined += chunk;
    }
    return this.parse<T>(key, joined);
  }

  async has(key: StorageKey | SecureStorageKey): Promise<boolean> {
    return (await this.get(key)) != null;
  }

  async save(key: StorageKey | SecureStorageKey, obj: any): Promise<any> {
    if (obj == null) {
      return this.remove(key);
    }

    const previousChunkCount = await this.getChunkCount(key);
    const serialized = JSON.stringify(obj);
    const chunks = splitIntoChunks(serialized, MAX_SECRET_CHUNK_BYTES);

    if (chunks.length === 1) {
      await passwords.setPassword(this.serviceName, key, serialized);
    } else {
      // Write the chunks before the manifest so a reader never sees a manifest that points at
      // chunks which have not been written yet.
      for (let i = 0; i < chunks.length; i++) {
        await passwords.setPassword(this.serviceName, this.chunkKey(key, i), chunks[i]);
      }
      const manifest: ChunkManifest = { dcChunkedSecret: true, chunks: chunks.length };
      await passwords.setPassword(this.serviceName, key, JSON.stringify(manifest));
    }

    // Clean up chunks left over from a previous, larger value.
    const newChunkCount = chunks.length === 1 ? 0 : chunks.length;
    await this.removeChunks(key, newChunkCount, previousChunkCount);
  }

  async remove(key: StorageKey | SecureStorageKey): Promise<any> {
    const chunkCount = await this.getChunkCount(key);
    await this.deleteIgnoringNotFound(key);
    await this.removeChunks(key, 0, chunkCount);
  }

  private chunkKey(key: StorageKey | SecureStorageKey, index: number): string {
    return `${key}:chunk:${index}`;
  }

  private async getRaw(key: string): Promise<string> {
    return passwords.getPassword(this.serviceName, key).catch((e: Error): string => {
      if (e.message === passwords.PASSWORD_NOT_FOUND) {
        return null;
      }
      throw e;
    });
  }

  private parse<T>(key: string, raw: string): T {
    try {
      return JSON.parse(raw) as T;
    } catch {
      this.logService.warning(
        `NativeSecureStorageService: failed to parse stored value for key "${key}"`,
      );
      return null;
    }
  }

  /** Returns how many chunks the value currently stored under `key` is split across (0 if not chunked). */
  private async getChunkCount(key: StorageKey | SecureStorageKey): Promise<number> {
    const raw = await this.getRaw(key);
    if (raw == null) {
      return 0;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      return isChunkManifest(parsed) ? parsed.chunks : 0;
    } catch {
      return 0;
    }
  }

  private async removeChunks(
    key: StorageKey | SecureStorageKey,
    fromIndex: number,
    toIndex: number,
  ): Promise<void> {
    for (let i = fromIndex; i < toIndex; i++) {
      await this.deleteIgnoringNotFound(this.chunkKey(key, i));
    }
  }

  private async deleteIgnoringNotFound(key: string): Promise<void> {
    return passwords.deletePassword(this.serviceName, key).catch((e: Error) => {
      if (e.message === passwords.PASSWORD_NOT_FOUND) {
        return;
      }
      throw e;
    });
  }
}
