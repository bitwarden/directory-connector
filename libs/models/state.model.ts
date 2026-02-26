// ===================================================================
// vNext Storage Keys (Flat key-value structure)
// ===================================================================

export const StorageKeysVNext = {
  stateVersion: "stateVersion",
  directoryType: "directoryType",
  organizationId: "organizationId",
  directory_ldap: "directory_ldap",
  directory_gsuite: "directory_gsuite",
  directory_entra: "directory_entra",
  directory_okta: "directory_okta",
  directory_onelogin: "directory_onelogin",
  sync: "sync",
  syncingDir: "syncingDir",

  // Window/Tray settings
  window: "window",
  enableAlwaysOnTop: "enableAlwaysOnTop",
  enableTray: "enableTray",
  enableMinimizeToTray: "enableMinimizeToTray",
  enableCloseToTray: "enableCloseToTray",
  alwaysShowDock: "alwaysShowDock",

  // Environment URLs
  environmentUrls: "environmentUrls",
};

export const SecureStorageKeysVNext: { [key: string]: any } = {
  // Directory service credentials
  ldap: "secret_ldap",
  gsuite: "secret_gsuite",
  // Azure Active Directory was renamed to Entra ID, but we've kept the old property name
  // to be backwards compatible with existing configurations.
  azure: "secret_azure",
  entra: "secret_entra",
  okta: "secret_okta",
  oneLogin: "secret_oneLogin",

  // Sync metadata
  userDelta: "userDeltaToken",
  groupDelta: "groupDeltaToken",
  lastUserSync: "lastUserSync",
  lastGroupSync: "lastGroupSync",
  lastSyncHash: "lastSyncHash",

  // Authentication tokens
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  apiKeyClientId: "apiKeyClientId",
  apiKeyClientSecret: "apiKeyClientSecret",
  twoFactorToken: "twoFactorToken",
};

// ===================================================================
// Legacy Storage Keys (Account-based hierarchy)
// ===================================================================

export const SecureStorageKeysLegacy = {
  ldap: "ldapPassword",
  gsuite: "gsuitePrivateKey",
  // Azure Active Directory was renamed to Entra ID, but we've kept the old property name
  // to be backwards compatible with existing configurations.
  azure: "azureKey",
  entra: "entraKey",
  okta: "oktaToken",
  oneLogin: "oneLoginClientSecret",
  userDelta: "userDeltaToken",
  groupDelta: "groupDeltaToken",
  lastUserSync: "lastUserSync",
  lastGroupSync: "lastGroupSync",
  lastSyncHash: "lastSyncHash",
};

export const TempKeys = {
  tempAccountSettings: "tempAccountSettings",
  tempDirectoryConfigs: "tempDirectoryConfigs",
  tempDirectorySettings: "tempDirectorySettings",
};

// ===================================================================
// Migration Storage Keys
// ===================================================================

export const SecureStorageKeysMigration: { [key: string]: any } = {
  ldap: "ldapPassword",
  gsuite: "gsuitePrivateKey",
  azure: "azureKey",
  entra: "entraIdKey",
  okta: "oktaToken",
  oneLogin: "oneLoginClientSecret",
  directoryConfigPrefix: "directoryConfig_",
  sync: "syncConfig",
  directoryType: "directoryType",
  organizationId: "organizationId",
};

export const MigrationKeys: { [key: string]: any } = {
  entityId: "entityId",
  directoryType: "directoryType",
  organizationId: "organizationId",
  lastUserSync: "lastUserSync",
  lastGroupSync: "lastGroupSync",
  lastSyncHash: "lastSyncHash",
  syncingDir: "syncingDir",
  syncConfig: "syncConfig",
  userDelta: "userDeltaToken",
  groupDelta: "groupDeltaToken",
  tempDirectoryConfigs: "tempDirectoryConfigs",
  tempDirectorySettings: "tempDirectorySettings",
};

export const MigrationStateKeys = {
  global: "global",
  authenticatedAccounts: "authenticatedAccounts",
};

export const MigrationClientKeys: { [key: string]: any } = {
  clientIdOld: "clientId",
  clientId: "apikey_clientId",
  clientSecretOld: "clientSecret",
  clientSecret: "apikey_clientSecret",
};

// ===================================================================
// Shared Constants
// ===================================================================

export const StoredSecurely = "[STORED SECURELY]";
