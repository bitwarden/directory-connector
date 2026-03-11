// ===================================================================
// Storage Keys (Flat key-value structure)
// ===================================================================

export const StorageKeys = {
  stateVersion: "stateVersion",
  directoryType: "directoryType",
  organizationId: "organizationId",
  directoryLdap: "directoryLdap",
  directoryGsuite: "directoryGsuite",
  directoryEntra: "directoryEntra",
  directoryOkta: "directoryOkta",
  directoryOnelogin: "directoryOnelogin",
  sync: "sync",
  syncingDir: "syncingDir",
  lastSyncHash: "lastSyncHash",

  // Window/Tray settings
  window: "window",
  enableAlwaysOnTop: "enableAlwaysOnTop",
  enableTray: "enableTray",
  enableMinimizeToTray: "enableMinimizeToTray",
  enableCloseToTray: "enableCloseToTray",
  alwaysShowDock: "alwaysShowDock",

  // Environment URLs
  environmentUrls: "environmentUrls",

  // App settings
  locale: "locale",
  installedVersion: "installedVersion",
  entityId: "entityId",
};

export const SecureStorageKeys: { [key: string]: any } = {
  // Directory service credentials
  ldap: "secretLdap",
  gsuite: "secretGsuite",
  // Azure Active Directory was renamed to Entra ID, but we've kept the old property name
  // to be backwards compatible with existing configurations.
  azure: "secretAzure",
  entra: "secretEntra",
  okta: "secretOkta",
  oneLogin: "secretOneLogin",

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
// Shared Constants
// ===================================================================

export const StoredSecurely = "[STORED SECURELY]";
