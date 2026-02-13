import { DirectoryType } from "@/src/enums/directoryType";

import { EntraIdConfiguration } from "./entraIdConfiguration";
import { GSuiteConfiguration } from "./gsuiteConfiguration";
import { LdapConfiguration } from "./ldapConfiguration";
import { OktaConfiguration } from "./oktaConfiguration";
import { OneLoginConfiguration } from "./oneLoginConfiguration";
import { SyncConfiguration } from "./syncConfiguration";

export class Account {
  // Authentication fields (flattened from nested profile/tokens/keys structure)
  userId: string;
  entityId: string;
  apiKeyClientId: string;
  accessToken: string;
  refreshToken: string;
  apiKeyClientSecret: string;

  // Directory Connector specific fields
  directoryConfigurations: DirectoryConfigurations = new DirectoryConfigurations();
  directorySettings: DirectorySettings = new DirectorySettings();

  // FIXME: Remove these compatibility fields after StateServiceVNext migration (PR #990) is merged
  // These fields are unused but required for type compatibility with jslib's StateService infrastructure
  data?: any;
  keys?: any;
  profile?: any;
  settings?: any;
  tokens?: any;

  constructor(init: Partial<Account>) {
    this.userId = init?.userId;
    this.entityId = init?.entityId;
    this.apiKeyClientId = init?.apiKeyClientId;
    this.accessToken = init?.accessToken;
    this.refreshToken = init?.refreshToken;
    this.apiKeyClientSecret = init?.apiKeyClientSecret;
    this.directoryConfigurations = init?.directoryConfigurations ?? new DirectoryConfigurations();
    this.directorySettings = init?.directorySettings ?? new DirectorySettings();
  }
}

export class DirectoryConfigurations {
  ldap: LdapConfiguration;
  gsuite: GSuiteConfiguration;
  entra: EntraIdConfiguration;
  // Azure Active Directory was renamed to Entra ID, but we've kept the old account property name
  // to be backwards compatible with existing configurations.
  azure: EntraIdConfiguration;
  okta: OktaConfiguration;
  oneLogin: OneLoginConfiguration;
}

export class DirectorySettings {
  organizationId?: string;
  sync?: SyncConfiguration;
  directoryType?: DirectoryType;
  userDelta?: string;
  groupDelta?: string;
  lastUserSync?: Date;
  lastGroupSync?: Date;
  lastSyncHash?: string;
  syncingDir?: boolean;
}
