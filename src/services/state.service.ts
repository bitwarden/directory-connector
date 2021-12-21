import { StateService as BaseStateService } from "jslib-common/services/state.service";

import { State } from "jslib-common/models/domain/state";
import { StorageOptions } from "jslib-common/models/domain/storageOptions";

import { Account } from "src/models/account";
import { AzureConfiguration } from "src/models/azureConfiguration";
import { GSuiteConfiguration } from "src/models/gsuiteConfiguration";
import { IConfiguration } from "src/models/IConfiguration";
import { LdapConfiguration } from "src/models/ldapConfiguration";
import { OktaConfiguration } from "src/models/oktaConfiguration";
import { OneLoginConfiguration } from "src/models/oneLoginConfiguration";

import { StateService as StateServiceAbstraction } from "src/abstractions/state.service";
import { DirectoryType } from "src/enums/directoryType";
import { SyncConfiguration } from "src/models/syncConfiguration";

const SecureStorageKeys = {
  ldap: "ldapPassword",
  gsuite: "gsuitePrivateKey",
  azure: "azureKey",
  okta: "oktaToken",
  oneLogin: "oneLoginClientSecret",
  userDelta: "userDeltaToken",
  groupDelta: "groupDeltaToken",
  lastUserSync: "lastUserSync",
  lastGroupSync: "lastGroupSync",
  lastSyncHash: "lastSyncHash",
};

export class StateService extends BaseStateService<Account> implements StateServiceAbstraction {
  async getLdapKey(options?: StorageOptions): Promise<string> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return null;
    }
    return await this.secureStorageService.get<string>(
      `${options.userId}_${SecureStorageKeys.ldap}`
    );
  }

  async setLdapKey(value: string, options?: StorageOptions): Promise<void> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return;
    }
    await this.secureStorageService.save(
      `${options.userId}_${SecureStorageKeys.ldap}`,
      value,
      options
    );
  }

  async getGsuiteKey(options?: StorageOptions): Promise<string> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return null;
    }
    return await this.secureStorageService.get<string>(
      `${options.userId}_${SecureStorageKeys.gsuite}`
    );
  }

  async setGsuiteKey(value: string, options?: StorageOptions): Promise<void> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return;
    }
    await this.secureStorageService.save(
      `${options.userId}_${SecureStorageKeys.gsuite}`,
      value,
      options
    );
  }

  async getAzureKey(options?: StorageOptions): Promise<string> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return null;
    }
    return await this.secureStorageService.get<string>(
      `${options.userId}_${SecureStorageKeys.azure}`
    );
  }

  async setAzureKey(value: string, options?: StorageOptions): Promise<void> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return;
    }
    await this.secureStorageService.save(
      `${options.userId}_${SecureStorageKeys.azure}`,
      value,
      options
    );
  }

  async getOktaKey(options?: StorageOptions): Promise<string> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return null;
    }
    return await this.secureStorageService.get<string>(
      `${options.userId}_${SecureStorageKeys.okta}`
    );
  }

  async setOktaKey(value: string, options?: StorageOptions): Promise<void> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return;
    }
    await this.secureStorageService.save(
      `${options.userId}_${SecureStorageKeys.okta}`,
      value,
      options
    );
  }

  async getOneLoginKey(options?: StorageOptions): Promise<string> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return null;
    }
    return await this.secureStorageService.get<string>(
      `${options.userId}_${SecureStorageKeys.oneLogin}`
    );
  }

  async setOneLoginKey(value: string, options?: StorageOptions): Promise<void> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return;
    }
    await this.secureStorageService.save(
      `${options.userId}_${SecureStorageKeys.oneLogin}`,
      value,
      options
    );
  }

  async getUserDelta(options?: StorageOptions): Promise<string> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return null;
    }
    return await this.secureStorageService.get<string>(
      `${options.userId}_${SecureStorageKeys.userDelta}`
    );
  }

  async setUserDelta(value: string, options?: StorageOptions): Promise<void> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return;
    }
    await this.secureStorageService.save(
      `${options.userId}_${SecureStorageKeys.userDelta}`,
      value,
      options
    );
  }

  async getGroupDelta(options?: StorageOptions): Promise<string> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return null;
    }
    return await this.secureStorageService.get<string>(
      `${options.userId}_${SecureStorageKeys.groupDelta}`
    );
  }

  async setGroupDelta(value: string, options?: StorageOptions): Promise<void> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return;
    }
    await this.secureStorageService.save(
      `${options.userId}_${SecureStorageKeys.groupDelta}`,
      value,
      options
    );
  }

  async getConfiguration(type: DirectoryType): Promise<IConfiguration> {
    switch (type) {
      case DirectoryType.Ldap:
        return await this.getLdapConfiguration();
      case DirectoryType.GSuite:
        return await this.getGsuiteConfiguration();
      case DirectoryType.AzureActiveDirectory:
        return await this.getAzureConfiguration();
      case DirectoryType.Okta:
        return await this.getOktaConfiguration();
      case DirectoryType.OneLogin:
        return await this.getOneLoginConfiguration();
    }
  }

  async getLdapConfiguration(options?: StorageOptions): Promise<LdapConfiguration> {
    return (
      await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskOptions()))
    )?.directoryConfigurations?.ldap;
  }

  async setLdapConfiguration(value: LdapConfiguration, options?: StorageOptions): Promise<void> {
    const account = await this.getAccount(
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
    account.directoryConfigurations.ldap = value;
    await this.saveAccount(
      account,
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
  }

  async getGsuiteConfiguration(options?: StorageOptions): Promise<GSuiteConfiguration> {
    return (
      await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskOptions()))
    )?.directoryConfigurations?.gsuite;
  }

  async setGsuiteConfiguration(
    value: GSuiteConfiguration,
    options?: StorageOptions
  ): Promise<void> {
    const account = await this.getAccount(
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
    account.directoryConfigurations.gsuite = value;
    await this.saveAccount(
      account,
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
  }

  async getAzureConfiguration(options?: StorageOptions): Promise<AzureConfiguration> {
    return (
      await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskOptions()))
    )?.directoryConfigurations?.azure;
  }

  async setAzureConfiguration(value: AzureConfiguration, options?: StorageOptions): Promise<void> {
    const account = await this.getAccount(
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
    account.directoryConfigurations.azure = value;
    await this.saveAccount(
      account,
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
  }

  async getOktaConfiguration(options?: StorageOptions): Promise<OktaConfiguration> {
    return (
      await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskOptions()))
    )?.directoryConfigurations?.okta;
  }

  async setOktaConfiguration(value: OktaConfiguration, options?: StorageOptions): Promise<void> {
    const account = await this.getAccount(
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
    account.directoryConfigurations.okta = value;
    await this.saveAccount(
      account,
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
  }

  async getOneLoginConfiguration(options?: StorageOptions): Promise<OneLoginConfiguration> {
    return (
      await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskOptions()))
    )?.directoryConfigurations?.oneLogin;
  }

  async setOneLoginConfiguration(
    value: OneLoginConfiguration,
    options?: StorageOptions
  ): Promise<void> {
    const account = await this.getAccount(
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
    account.directoryConfigurations.oneLogin = value;
    await this.saveAccount(
      account,
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
  }

  async getOrganizationId(options?: StorageOptions): Promise<string> {
    return (
      await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskOptions()))
    )?.directorySettings?.organizationId;
  }

  async setOrganizationId(value: string, options?: StorageOptions): Promise<void> {
    const account = await this.getAccount(
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
    account.directorySettings.organizationId = value;
    await this.saveAccount(
      account,
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
  }

  async getSync(options?: StorageOptions): Promise<SyncConfiguration> {
    return (
      await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskOptions()))
    )?.directorySettings?.sync;
  }

  async setSync(value: SyncConfiguration, options?: StorageOptions): Promise<void> {
    const account = await this.getAccount(
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
    account.directorySettings.sync = value;
    await this.saveAccount(
      account,
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
  }

  async getDirectoryType(options?: StorageOptions): Promise<DirectoryType> {
    return (
      await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskOptions()))
    )?.directorySettings?.directoryType;
  }

  async setDirectoryType(value: DirectoryType, options?: StorageOptions): Promise<void> {
    const account = await this.getAccount(
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
    account.directorySettings.directoryType = value;
    await this.saveAccount(
      account,
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
  }

  async getLastUserSync(options?: StorageOptions): Promise<Date> {
    return (
      await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskOptions()))
    )?.directorySettings?.lastUserSync;
  }

  async setLastUserSync(value: Date, options?: StorageOptions): Promise<void> {
    const account = await this.getAccount(
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
    account.directorySettings.lastUserSync = value;
    await this.saveAccount(
      account,
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
  }

  async getLastGroupSync(options?: StorageOptions): Promise<Date> {
    return (
      await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskOptions()))
    )?.directorySettings?.lastGroupSync;
  }

  async setLastGroupSync(value: Date, options?: StorageOptions): Promise<void> {
    const account = await this.getAccount(
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
    account.directorySettings.lastGroupSync = value;
    await this.saveAccount(
      account,
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
  }

  async getLastSyncHash(options?: StorageOptions): Promise<string> {
    return (
      await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskOptions()))
    )?.directorySettings?.lastSyncHash;
  }

  async setLastSyncHash(value: string, options?: StorageOptions): Promise<void> {
    const account = await this.getAccount(
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
    account.directorySettings.lastSyncHash = value;
    await this.saveAccount(
      account,
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
  }

  async getSyncingDir(options?: StorageOptions): Promise<boolean> {
    return (await this.getAccount(this.reconcileOptions(options, this.defaultInMemoryOptions)))
      ?.directorySettings?.syncingDir;
  }

  async setSyncingDir(value: boolean, options?: StorageOptions): Promise<void> {
    const account = await this.getAccount(
      this.reconcileOptions(options, this.defaultInMemoryOptions)
    );
    account.directorySettings.syncingDir = value;
    await this.saveAccount(account, this.reconcileOptions(options, this.defaultInMemoryOptions));
  }

  protected async scaffoldNewAccountStorage(account: Account): Promise<void> {
    await this.scaffoldNewAccountDiskStorage(account);
  }

  protected async scaffoldNewAccountDiskStorage(account: Account): Promise<void> {
    const storedState =
      (await this.storageService.get<State<Account>>(
        "state",
        await this.defaultOnDiskLocalOptions()
      )) ?? new State<Account>();
    const storedAccount = storedState.accounts[account.profile.userId];
    if (storedAccount != null) {
      account.settings = storedAccount.settings;
      account.directorySettings = storedAccount.directorySettings;
      account.directoryConfigurations = storedAccount.directoryConfigurations;
    }
    storedState.accounts[account.profile.userId] = account;
    await this.saveStateToStorage(storedState, await this.defaultOnDiskLocalOptions());
  }
}
