import { EncryptionType } from "@/libs/enums/encryptionType";

/**
 * Encrypts secrets that are too large for OS secure storage, following the approach the Auth team
 * took for access tokens (bitwarden/clients#8412): a random symmetric key is kept in secure
 * storage, and the secret is encrypted with it and written to regular (on-disk) storage.
 *
 * Windows Credential Manager rejects values over 2560 bytes, and desktop_core stores them as
 * UTF-16, so only ~1280 characters fit - less than a Google Workspace service account private key.
 * The key stored here is ~90 characters.
 *
 * The encrypted value uses Bitwarden's EncString format for AES-256-CBC with HMAC-SHA256
 * (`2.<iv>|<data>|<mac>`, all base64, MAC computed over iv + data), matching EncryptService.
 *
 * WebCrypto is used rather than Node's crypto module because the renderer process (where the
 * settings screen saves configuration) runs without Node integration.
 */

const ENC_KEY_BYTES = 32;
const MAC_KEY_BYTES = 32;
const IV_BYTES = 16;

function subtle(): SubtleCrypto {
  return globalThis.crypto.subtle;
}

function toB64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromB64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(a.byteLength + b.byteLength);
  result.set(a, 0);
  result.set(b, a.byteLength);
  return result;
}

async function importKeys(keyB64: string): Promise<{ encKey: CryptoKey; macKey: CryptoKey }> {
  const key = fromB64(keyB64);
  if (key.byteLength !== ENC_KEY_BYTES + MAC_KEY_BYTES) {
    throw new Error("Invalid secret encryption key.");
  }
  const encKey = await subtle().importKey(
    "raw",
    key.slice(0, ENC_KEY_BYTES),
    { name: "AES-CBC" },
    false,
    ["encrypt", "decrypt"],
  );
  const macKey = await subtle().importKey(
    "raw",
    key.slice(ENC_KEY_BYTES),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return { encKey, macKey };
}

/** Generates a new random 512-bit key (256-bit AES key + 256-bit MAC key), base64 encoded. */
export function generateSecretEncryptionKey(): string {
  return toB64(globalThis.crypto.getRandomValues(new Uint8Array(ENC_KEY_BYTES + MAC_KEY_BYTES)));
}

/** Encrypts `plaintext` with a key from {@link generateSecretEncryptionKey}. */
export async function encryptSecret(plaintext: string, keyB64: string): Promise<string> {
  const { encKey, macKey } = await importKeys(keyB64);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const data = new Uint8Array(
    await subtle().encrypt({ name: "AES-CBC", iv }, encKey, new TextEncoder().encode(plaintext)),
  );
  const mac = new Uint8Array(await subtle().sign("HMAC", macKey, concat(iv, data)));
  return `${EncryptionType.AesCbc256_HmacSha256_B64}.${toB64(iv)}|${toB64(data)}|${toB64(mac)}`;
}

/**
 * Decrypts a value produced by {@link encryptSecret}.
 * Throws if the value is malformed, was encrypted with a different key, or has been tampered with.
 */
export async function decryptSecret(encrypted: string, keyB64: string): Promise<string> {
  const match = /^(\d+)\.([^|]+)\|([^|]+)\|([^|]+)$/.exec(encrypted);
  if (match == null || Number(match[1]) !== EncryptionType.AesCbc256_HmacSha256_B64) {
    throw new Error("Unsupported encrypted secret format.");
  }

  const iv = fromB64(match[2]);
  const data = fromB64(match[3]);
  const mac = fromB64(match[4]);
  const { encKey, macKey } = await importKeys(keyB64);

  // Verify before decrypting (encrypt-then-MAC). subtle.verify compares in constant time.
  if (!(await subtle().verify("HMAC", macKey, mac, concat(iv, data)))) {
    throw new Error("Encrypted secret failed integrity check.");
  }

  const plaintext = await subtle().decrypt({ name: "AES-CBC", iv }, encKey, data);
  return new TextDecoder().decode(plaintext);
}
