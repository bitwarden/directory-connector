import { DirectoryType } from "@/libs/enums/directoryType";

import { EntraIdConfiguration } from "./entraIdConfiguration";
import { GSuiteConfiguration } from "./gsuiteConfiguration";
import { LdapConfiguration } from "./ldapConfiguration";
import { OktaConfiguration } from "./oktaConfiguration";
import { OneLoginConfiguration } from "./oneLoginConfiguration";
import { SyncConfiguration } from "./syncConfiguration";

export class ClientKeys {
  clientId: string;
  clientSecret: string;
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
