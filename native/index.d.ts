export declare namespace passwords {
  /** The error message returned when a password is not found during retrieval or deletion. */
  export const PASSWORD_NOT_FOUND: string;

  /**
   * Fetch the stored password from the keychain.
   * Throws an Error with message PASSWORD_NOT_FOUND if the password does not exist.
   */
  export function getPassword(service: string, account: string): Promise<string>;

  /**
   * Save the password to the keychain. Adds an entry if none exists, otherwise updates it.
   */
  export function setPassword(service: string, account: string, password: string): Promise<void>;

  /**
   * Delete the stored password from the keychain.
   * Throws an Error with message PASSWORD_NOT_FOUND if the password does not exist.
   */
  export function deletePassword(service: string, account: string): Promise<void>;

  /**
   * Check if OS secure storage is available.
   */
  export function isAvailable(): Promise<boolean>;

  /**
   * Migrate a credential previously stored by keytar (UTF-8 blob on Windows) to the UTF-16
   * format used by desktop_core. No-ops on non-Windows platforms.
   *
   * Returns true if a migration was performed, false otherwise.
   */
  export function migrateKeytarPassword(service: string, account: string): Promise<boolean>;
}
