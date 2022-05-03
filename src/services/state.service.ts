import { LogService } from "jslib-common/abstractions/log.service";
import { StateMigrationService } from "jslib-common/abstractions/stateMigration.service";
import { StorageService } from "jslib-common/abstractions/storage.service";
import { StateFactory } from "jslib-common/factories/stateFactory";
import { EnvironmentUrls } from "jslib-common/models/domain/environmentUrls";
import { GlobalState } from "jslib-common/models/domain/globalState";
import { StorageOptions } from "jslib-common/models/domain/storageOptions";
import { StateService as BaseStateService } from "jslib-common/services/state.service";

import { StateService as StateServiceAbstraction } from "src/abstractions/state.service";
import { DirectoryType } from "src/enums/directoryType";
import { IConfiguration } from "src/models/IConfiguration";
import { Account } from "src/models/account";
import { AzureConfiguration } from "src/models/azureConfiguration";
import { GSuiteConfiguration } from "src/models/gsuiteConfiguration";
import { LdapConfiguration } from "src/models/ldapConfiguration";
import { OktaConfiguration } from "src/models/oktaConfiguration";
import { OneLoginConfiguration } from "src/models/oneLoginConfiguration";
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

const keys = {
  tempAccountSettings: "tempAccountSettings",
  tempDirectoryConfigs: "tempDirectoryConfigs",
  tempDirectorySettings: "tempDirectorySettings",
};

const StoredSecurely = "[STORED SECURELY]";

export class StateService
  extends BaseStateService<GlobalState, Account>
  implements StateServiceAbstraction
{
  constructor(
    protected storageService: StorageService,
    protected secureStorageService: StorageService,
    protected logService: LogService,
    protected stateMigrationService: StateMigrationService,
    private useSecureStorageForSecrets = true,
    protected stateFactory: StateFactory<GlobalState, Account>
  ) {
    super(storageService, secureStorageService, logService, stateMigrationService, stateFactory);
  }

  async getDirectory<T extends IConfiguration>(type: DirectoryType): Promise<T> {
    const config = await this.getConfiguration(type);
    if (config == null) {
      return config as T;
    }

    if (this.useSecureStorageForSecrets) {
      // Do not introduce secrets into the in-memory account object
      const configWithSecrets = Object.assign({}, config);

      switch (type) {
        case DirectoryType.Ldap:
          (configWithSecrets as any).password = await this.getLdapKey();
          break;
        case DirectoryType.AzureActiveDirectory:
          (configWithSecrets as any).key = await this.getAzureKey();
          break;
        case DirectoryType.Okta:
          (configWithSecrets as any).token = await this.getOktaKey();
          break;
        case DirectoryType.GSuite:
          (configWithSecrets as any).privateKey = await this.getGsuiteKey();
          break;
        case DirectoryType.OneLogin:
          (configWithSecrets as any).clientSecret = await this.getOneLoginKey();
          break;
      }

      return configWithSecrets as T;
    }

    return config as T;
  }

  async setDirectory(
    type: DirectoryType,
    config:
      | LdapConfiguration
      | GSuiteConfiguration
      | AzureConfiguration
      | OktaConfiguration
      | OneLoginConfiguration
  ): Promise<any> {
    if (this.useSecureStorageForSecrets) {
      switch (type) {
        case DirectoryType.Ldap: {
          const ldapConfig = config as LdapConfiguration;
          await this.setLdapKey(ldapConfig.password);
          ldapConfig.password = StoredSecurely;
          await this.setLdapConfiguration(ldapConfig);
          break;
        }
        case DirectoryType.AzureActiveDirectory: {
          const azureConfig = config as AzureConfiguration;
          await this.setAzureKey(azureConfig.key);
          azureConfig.key = StoredSecurely;
          await this.setAzureConfiguration(azureConfig);
          break;
        }
        case DirectoryType.Okta: {
          const oktaConfig = config as OktaConfiguration;
          await this.setOktaKey(oktaConfig.token);
          oktaConfig.token = StoredSecurely;
          await this.setOktaConfiguration(oktaConfig);
          break;
        }
        case DirectoryType.GSuite: {
          const gsuiteConfig = config as GSuiteConfiguration;
          if (gsuiteConfig.privateKey == null) {
            await this.setGsuiteKey(null);
          } else {
            const normalizedPrivateKey = gsuiteConfig.privateKey.replace(/\\n/g, "\n");
            await this.setGsuiteKey(normalizedPrivateKey);
            gsuiteConfig.privateKey = StoredSecurely;
          }
          await this.setGsuiteConfiguration(gsuiteConfig);
          break;
        }
        case DirectoryType.OneLogin: {
          const oneLoginConfig = config as OneLoginConfiguration;
          await this.setOneLoginKey(oneLoginConfig.clientSecret);
          oneLoginConfig.clientSecret = StoredSecurely;
          await this.setOneLoginConfiguration(oneLoginConfig);
          break;
        }
      }
    }
  }

  private async getLdapKey(options?: StorageOptions): Promise<string> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return null;
    }
    return await this.secureStorageService.get<string>(
      `${options.userId}_${SecureStorageKeys.ldap}`
    );
  }

  private async setLdapKey(value: string, options?: StorageOptions): Promise<void> {
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

  private async getGsuiteKey(options?: StorageOptions): Promise<string> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return null;
    }
    return await this.secureStorageService.get<string>(
      `${options.userId}_${SecureStorageKeys.gsuite}`
    );
  }

  private async setGsuiteKey(value: string, options?: StorageOptions): Promise<void> {
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

  private async getAzureKey(options?: StorageOptions): Promise<string> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return null;
    }
    return await this.secureStorageService.get<string>(
      `${options.userId}_${SecureStorageKeys.azure}`
    );
  }

  private async setAzureKey(value: string, options?: StorageOptions): Promise<void> {
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

  private async getOktaKey(options?: StorageOptions): Promise<string> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return null;
    }
    return await this.secureStorageService.get<string>(
      `${options.userId}_${SecureStorageKeys.okta}`
    );
  }

  private async setOktaKey(value: string, options?: StorageOptions): Promise<void> {
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

  private async getOneLoginKey(options?: StorageOptions): Promise<string> {
    options = this.reconcileOptions(options, await this.defaultSecureStorageOptions());
    if (options?.userId == null) {
      return null;
    }
    return await this.secureStorageService.get<string>(
      `${options.userId}_${SecureStorageKeys.oneLogin}`
    );
  }

  private async setOneLoginKey(value: string, options?: StorageOptions): Promise<void> {
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
    const currentId = await this.getOrganizationId();
    if (currentId !== value) {
      await this.clearSyncSettings();
    }

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
    const currentType = await this.getDirectoryType();
    if (value !== currentType) {
      await this.clearSyncSettings();
    }
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
    const userSyncDate = (
      await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskOptions()))
    )?.directorySettings?.lastUserSync;
    return userSyncDate ? new Date(userSyncDate) : null;
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
    const groupSyncDate = (
      await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskOptions()))
    )?.directorySettings?.lastGroupSync;
    return groupSyncDate ? new Date(groupSyncDate) : null;
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

  async getUserDelta(options?: StorageOptions): Promise<string> {
    return (
      await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskOptions()))
    )?.directorySettings?.userDelta;
  }

  async setUserDelta(value: string, options?: StorageOptions): Promise<void> {
    const account = await this.getAccount(
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
    account.directorySettings.userDelta = value;
    await this.saveAccount(
      account,
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
  }

  async getGroupDelta(options?: StorageOptions): Promise<string> {
    return (
      await this.getAccount(this.reconcileOptions(options, await this.defaultOnDiskOptions()))
    )?.directorySettings?.groupDelta;
  }

  async setGroupDelta(value: string, options?: StorageOptions): Promise<void> {
    const account = await this.getAccount(
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
    account.directorySettings.groupDelta = value;
    await this.saveAccount(
      account,
      this.reconcileOptions(options, await this.defaultOnDiskOptions())
    );
  }

  async clearSyncSettings(hashToo = false) {
    await this.setUserDelta(null);
    await this.setGroupDelta(null);
    await this.setLastGroupSync(null);
    await this.setLastUserSync(null);
    if (hashToo) {
      await this.setLastSyncHash(null);
    }
  }

  protected async scaffoldNewAccountStorage(account: Account): Promise<void> {
    await this.scaffoldNewAccountDiskStorage(account);
  }

  protected async scaffoldNewAccountDiskStorage(account: Account): Promise<void> {
    const storageOptions = this.reconcileOptions(
      { userId: account.profile.userId },
      await this.defaultOnDiskLocalOptions()
    );

    const storedAccount = await this.getAccount(storageOptions);
    if (storedAccount != null) {
      account.settings = storedAccount.settings;
      account.directorySettings = storedAccount.directorySettings;
      account.directoryConfigurations = storedAccount.directoryConfigurations;
    } else if (await this.hasTemporaryStorage()) {
      // If migrating to state V2 with an no actively authed account we store temporary data to be copied on auth - this will only be run once.
      account.settings = await this.storageService.get<any>(keys.tempAccountSettings);
      account.directorySettings = await this.storageService.get<any>(keys.tempDirectorySettings);
      account.directoryConfigurations = await this.storageService.get<any>(
        keys.tempDirectoryConfigs
      );
      await this.storageService.remove(keys.tempAccountSettings);
      await this.storageService.remove(keys.tempDirectorySettings);
      await this.storageService.remove(keys.tempDirectoryConfigs);
    }

    await this.saveAccount(account, storageOptions);
  }

  protected async pushAccounts(): Promise<void> {
    if (this.state?.accounts == null || Object.keys(this.state.accounts).length < 1) {
      this.accounts.next(null);
      return;
    }
    this.accounts.next(this.state.accounts);
  }

  protected async hasTemporaryStorage(): Promise<boolean> {
    return (
      (await this.storageService.has(keys.tempAccountSettings)) ||
      (await this.storageService.has(keys.tempDirectorySettings)) ||
      (await this.storageService.has(keys.tempDirectoryConfigs))
    );
  }

  protected resetAccount(account: Account) {
    const persistentAccountInformation = {
      settings: account.settings,
      directorySettings: account.directorySettings,
      directoryConfigurations: account.directoryConfigurations,
    };
    return Object.assign(this.createAccount(), persistentAccountInformation);
  }

  async getEnvironmentUrls(options?: StorageOptions): Promise<EnvironmentUrls> {
    return this.getGlobalEnvironmentUrls(options);
  }
}
