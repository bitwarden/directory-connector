import { DirectoryType } from "@/libs/enums/directoryType";

import { EntraIdConfiguration } from "./entraIdConfiguration";
import { GSuiteConfiguration } from "./gsuiteConfiguration";
import { LdapConfiguration } from "./ldapConfiguration";
import { OktaConfiguration } from "./oktaConfiguration";
import { OneLoginConfiguration } from "./oneLoginConfiguration";
import { SyncConfiguration } from "./syncConfiguration";

/**
 * A single saved directory-connector configuration ("profile"). `data.json` can hold many of
 * these side by side (e.g. one per AD domain, service account, or Bitwarden organization), and
 * exactly one is "active" at a time (see `StorageKeys.activeDirectoryProfileId`).
 *
 * This mirrors the same fields that used to live at fixed top-level `data.json` keys
 * (`directoryType`, `organizationId`, `sync`, `directoryLdap`, etc.) - those flat keys still
 * exist and continue to reflect whichever profile is currently active, so `SyncService` and
 * existing CLI/GUI code keep working unmodified.
 *
 * Config objects (`ldap`, `gsuite`, ...) never contain plaintext secrets - those are stored in
 * OS secure storage scoped by this profile's `id` (see `secret-storage-key.util.ts`), exactly
 * like the flat keys did before.
 */
export class DirectoryConnectorProfile {
  id: string;
  /** User-assigned display name (e.g. "Corporate AD", "Okta - EU tenant"). */
  name: string;
  directoryType?: DirectoryType;
  organizationId?: string;
  sync?: SyncConfiguration;
  ldap?: LdapConfiguration;
  gsuite?: GSuiteConfiguration;
  entra?: EntraIdConfiguration;
  oneLogin?: OneLoginConfiguration;
  okta?: OktaConfiguration;
  userDelta?: string;
  groupDelta?: string;
  lastUserSync?: Date;
  lastGroupSync?: Date;
  lastSyncHash?: string;
  syncingDir?: boolean;
}

/** Non-secret summary of a profile, safe to use for listing/selection UI. */
export class DirectoryConnectorProfileSummary {
  id: string;
  name: string;
  directoryType?: DirectoryType;
  organizationId?: string;
}

export function toProfileSummary(
  profile: DirectoryConnectorProfile,
): DirectoryConnectorProfileSummary {
  return {
    id: profile.id,
    name: profile.name,
    directoryType: profile.directoryType,
    organizationId: profile.organizationId,
  };
}
