import { Account as BaseAccount } from "jslib-common/models/domain/account";

import { DirectoryType } from "src/enums/directoryType";

import { AzureConfiguration } from "./azureConfiguration";
import { GSuiteConfiguration } from "./gsuiteConfiguration";
import { LdapConfiguration } from "./ldapConfiguration";
import { OktaConfiguration } from "./oktaConfiguration";
import { OneLoginConfiguration } from "./oneLoginConfiguration";
import { SyncConfiguration } from "./syncConfiguration";

export class Account extends BaseAccount {
  directoryConfigurations?: DirectoryConfigurations = new DirectoryConfigurations();
  directorySettings: DirectorySettings = new DirectorySettings();

  constructor(init: Partial<Account>) {
    super(init);
    this.directoryConfigurations = init.directoryConfigurations ?? new DirectoryConfigurations();
    this.directorySettings = init.directorySettings ?? new DirectorySettings();
  }
}

export class DirectoryConfigurations {
  ldap: LdapConfiguration;
  gsuite: GSuiteConfiguration;
  azure: AzureConfiguration;
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
