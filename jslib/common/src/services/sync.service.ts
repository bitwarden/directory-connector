import { ApiService } from "../abstractions/api.service";
import { CryptoService } from "../abstractions/crypto.service";
import { KeyConnectorService } from "../abstractions/keyConnector.service";
import { LogService } from "../abstractions/log.service";
import { MessagingService } from "../abstractions/messaging.service";
import { OrganizationService } from "../abstractions/organization.service";
import { PolicyService } from "../abstractions/policy.service";
import { SettingsService } from "../abstractions/settings.service";
import { StateService } from "../abstractions/state.service";
import { SyncService as SyncServiceAbstraction } from "../abstractions/sync.service";
import { sequentialize } from "../misc/sequentialize";
import { OrganizationData } from "../models/data/organizationData";
import { PolicyData } from "../models/data/policyData";
import { DomainsResponse } from "../models/response/domainsResponse";
import { PolicyResponse } from "../models/response/policyResponse";
import { ProfileResponse } from "../models/response/profileResponse";

export class SyncService implements SyncServiceAbstraction {
  syncInProgress = false;

  constructor(
    private apiService: ApiService,
    private settingsService: SettingsService,
    private cryptoService: CryptoService,
    private messagingService: MessagingService,
    private policyService: PolicyService,
    private logService: LogService,
    private keyConnectorService: KeyConnectorService,
    private stateService: StateService,
    private organizationService: OrganizationService,
    private logoutCallback: (expired: boolean) => Promise<void>,
  ) {}

  async getLastSync(): Promise<Date> {
    if ((await this.stateService.getUserId()) == null) {
      return null;
    }

    const lastSync = await this.stateService.getLastSync();
    if (lastSync) {
      return new Date(lastSync);
    }

    return null;
  }

  async setLastSync(date: Date, userId?: string): Promise<any> {
    await this.stateService.setLastSync(date.toJSON(), { userId: userId });
  }

  @sequentialize(() => "fullSync")
  async fullSync(forceSync: boolean, allowThrowOnError = false): Promise<boolean> {
    this.syncStarted();
    const isAuthenticated = await this.stateService.getIsAuthenticated();
    if (!isAuthenticated) {
      return this.syncCompleted(false);
    }

    const now = new Date();
    let needsSync = false;
    try {
      needsSync = await this.needsSyncing(forceSync);
    } catch (e) {
      if (allowThrowOnError) {
        throw e;
      }
    }

    if (!needsSync) {
      await this.setLastSync(now);
      return this.syncCompleted(false);
    }

    try {
      await this.apiService.refreshIdentityToken();
      const response = await this.apiService.getSync();

      await this.syncProfile(response.profile);
      await this.syncSettings(response.domains);
      await this.syncPolicies(response.policies);

      await this.setLastSync(now);
      return this.syncCompleted(true);
    } catch (e) {
      if (allowThrowOnError) {
        throw e;
      } else {
        return this.syncCompleted(false);
      }
    }
  }

  // Helpers

  private syncStarted() {
    this.syncInProgress = true;
    this.messagingService.send("syncStarted");
  }

  private syncCompleted(successfully: boolean): boolean {
    this.syncInProgress = false;
    this.messagingService.send("syncCompleted", { successfully: successfully });
    return successfully;
  }

  private async needsSyncing(forceSync: boolean) {
    if (forceSync) {
      return true;
    }

    const lastSync = await this.getLastSync();
    if (lastSync == null || lastSync.getTime() === 0) {
      return true;
    }

    const response = await this.apiService.getAccountRevisionDate();
    if (new Date(response) <= lastSync) {
      return false;
    }
    return true;
  }

  private async syncProfile(response: ProfileResponse) {
    const stamp = await this.stateService.getSecurityStamp();
    if (stamp != null && stamp !== response.securityStamp) {
      if (this.logoutCallback != null) {
        await this.logoutCallback(true);
      }

      throw new Error("Stamp has changed");
    }

    await this.cryptoService.setEncKey(response.key);
    await this.cryptoService.setEncPrivateKey(response.privateKey);
    await this.cryptoService.setOrgKeys(response.organizations, response.providerOrganizations);
    await this.stateService.setSecurityStamp(response.securityStamp);
    await this.stateService.setEmailVerified(response.emailVerified);
    await this.stateService.setForcePasswordReset(response.forcePasswordReset);
    await this.keyConnectorService.setUsesKeyConnector(response.usesKeyConnector);

    const organizations: { [id: string]: OrganizationData } = {};
    response.organizations.forEach((o) => {
      organizations[o.id] = new OrganizationData(o);
    });

    response.providerOrganizations.forEach((o) => {
      if (organizations[o.id] == null) {
        organizations[o.id] = new OrganizationData(o);
        organizations[o.id].isProviderUser = true;
      }
    });

    await this.organizationService.save(organizations);

    if (await this.keyConnectorService.userNeedsMigration()) {
      await this.keyConnectorService.setConvertAccountRequired(true);
      this.messagingService.send("convertAccountToKeyConnector");
    } else {
      this.keyConnectorService.removeConvertAccountRequired();
    }
  }

  private async syncSettings(response: DomainsResponse) {
    let eqDomains: string[][] = [];
    if (response != null && response.equivalentDomains != null) {
      eqDomains = eqDomains.concat(response.equivalentDomains);
    }

    if (response != null && response.globalEquivalentDomains != null) {
      response.globalEquivalentDomains.forEach((global) => {
        if (global.domains.length > 0) {
          eqDomains.push(global.domains);
        }
      });
    }

    return this.settingsService.setEquivalentDomains(eqDomains);
  }

  private async syncPolicies(response: PolicyResponse[]) {
    const policies: { [id: string]: PolicyData } = {};
    if (response != null) {
      response.forEach((p) => {
        policies[p.id] = new PolicyData(p);
      });
    }
    return await this.policyService.replace(policies);
  }
}
