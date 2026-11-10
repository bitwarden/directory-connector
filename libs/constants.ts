export const APPLICATION_NAME = "Bitwarden Directory Connector";

/**
 * Maximum UTF-8 byte length for a secret value stored via Windows Credential Manager.
 *
 * Mirrors MAX_CREDENTIAL_BLOB_SIZE (5 * 512 = 2560 bytes) in native/src/encoding.rs, minus the
 * 2-byte V1 blob header (VERSION_MARKER + V1_HEADER) that BlobVersion::encode prepends before
 * the UTF-8 payload. Windows-only: macOS Keychain and Linux secret storage have no equivalent
 * limit.
 */
export const MAX_WINDOWS_CREDENTIAL_SECRET_BYTES = 5 * 512 - 2; // 2558
