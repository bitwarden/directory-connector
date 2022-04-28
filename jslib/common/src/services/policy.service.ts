import { ApiService } from "../abstractions/api.service";
import { OrganizationService } from "../abstractions/organization.service";
import { PolicyService as PolicyServiceAbstraction } from "../abstractions/policy.service";
import { StateService } from "../abstractions/state.service";
import { OrganizationUserStatusType } from "../enums/organizationUserStatusType";
import { OrganizationUserType } from "../enums/organizationUserType";
import { PolicyType } from "../enums/policyType";
import { PolicyData } from "../models/data/policyData";
import { MasterPasswordPolicyOptions } from "../models/domain/masterPasswordPolicyOptions";
import { Organization } from "../models/domain/organization";
import { Policy } from "../models/domain/policy";
import { ResetPasswordPolicyOptions } from "../models/domain/resetPasswordPolicyOptions";
import { ListResponse } from "../models/response/listResponse";
import { PolicyResponse } from "../models/response/policyResponse";

export class PolicyService implements PolicyServiceAbstraction {
  policyCache: Policy[];

  constructor(
    private stateService: StateService,
    private organizationService: OrganizationService,
    private apiService: ApiService
  ) {}

  async clearCache(): Promise<void> {
    await this.stateService.setDecryptedPolicies(null);
  }

  async getAll(type?: PolicyType, userId?: string): Promise<Policy[]> {
    let response: Policy[] = [];
    const decryptedPolicies = await this.stateService.getDecryptedPolicies({ userId: userId });
    if (decryptedPolicies != null) {
      response = decryptedPolicies;
    } else {
      const diskPolicies = await this.stateService.getEncryptedPolicies({ userId: userId });
      for (const id in diskPolicies) {
        // eslint-disable-next-line
        if (diskPolicies.hasOwnProperty(id)) {
          response.push(new Policy(diskPolicies[id]));
        }
      }
      await this.stateService.setDecryptedPolicies(response, { userId: userId });
    }
    if (type != null) {
      return response.filter((policy) => policy.type === type);
    } else {
      return response;
    }
  }

  async getPolicyForOrganization(policyType: PolicyType, organizationId: string): Promise<Policy> {
    const org = await this.organizationService.get(organizationId);
    if (org?.isProviderUser) {
      const orgPolicies = await this.apiService.getPolicies(organizationId);
      const policy = orgPolicies.data.find((p) => p.organizationId === organizationId);

      if (policy == null) {
        return null;
      }

      return new Policy(new PolicyData(policy));
    }

    const policies = await this.getAll(policyType);
    return policies.find((p) => p.organizationId === organizationId);
  }

  async replace(policies: { [id: string]: PolicyData }): Promise<any> {
    await this.stateService.setDecryptedPolicies(null);
    await this.stateService.setEncryptedPolicies(policies);
  }

  async clear(userId?: string): Promise<any> {
    await this.stateService.setDecryptedPolicies(null, { userId: userId });
    await this.stateService.setEncryptedPolicies(null, { userId: userId });
  }

  async getMasterPasswordPoliciesForInvitedUsers(
    orgId: string
  ): Promise<MasterPasswordPolicyOptions> {
    const userId = await this.stateService.getUserId();
    const response = await this.apiService.getPoliciesByInvitedUser(orgId, userId);
    const policies = await this.mapPoliciesFromToken(response);
    return this.getMasterPasswordPolicyOptions(policies);
  }

  async getMasterPasswordPolicyOptions(policies?: Policy[]): Promise<MasterPasswordPolicyOptions> {
    let enforcedOptions: MasterPasswordPolicyOptions = null;

    if (policies == null) {
      policies = await this.getAll(PolicyType.MasterPassword);
    } else {
      policies = policies.filter((p) => p.type === PolicyType.MasterPassword);
    }

    if (policies == null || policies.length === 0) {
      return enforcedOptions;
    }

    policies.forEach((currentPolicy) => {
      if (!currentPolicy.enabled || currentPolicy.data == null) {
        return;
      }

      if (enforcedOptions == null) {
        enforcedOptions = new MasterPasswordPolicyOptions();
      }

      if (
        currentPolicy.data.minComplexity != null &&
        currentPolicy.data.minComplexity > enforcedOptions.minComplexity
      ) {
        enforcedOptions.minComplexity = currentPolicy.data.minComplexity;
      }

      if (
        currentPolicy.data.minLength != null &&
        currentPolicy.data.minLength > enforcedOptions.minLength
      ) {
        enforcedOptions.minLength = currentPolicy.data.minLength;
      }

      if (currentPolicy.data.requireUpper) {
        enforcedOptions.requireUpper = true;
      }

      if (currentPolicy.data.requireLower) {
        enforcedOptions.requireLower = true;
      }

      if (currentPolicy.data.requireNumbers) {
        enforcedOptions.requireNumbers = true;
      }

      if (currentPolicy.data.requireSpecial) {
        enforcedOptions.requireSpecial = true;
      }
    });

    return enforcedOptions;
  }

  evaluateMasterPassword(
    passwordStrength: number,
    newPassword: string,
    enforcedPolicyOptions: MasterPasswordPolicyOptions
  ): boolean {
    if (enforcedPolicyOptions == null) {
      return true;
    }

    if (
      enforcedPolicyOptions.minComplexity > 0 &&
      enforcedPolicyOptions.minComplexity > passwordStrength
    ) {
      return false;
    }

    if (
      enforcedPolicyOptions.minLength > 0 &&
      enforcedPolicyOptions.minLength > newPassword.length
    ) {
      return false;
    }

    if (enforcedPolicyOptions.requireUpper && newPassword.toLocaleLowerCase() === newPassword) {
      return false;
    }

    if (enforcedPolicyOptions.requireLower && newPassword.toLocaleUpperCase() === newPassword) {
      return false;
    }

    if (enforcedPolicyOptions.requireNumbers && !/[0-9]/.test(newPassword)) {
      return false;
    }

    // eslint-disable-next-line
    if (enforcedPolicyOptions.requireSpecial && !/[!@#$%\^&*]/g.test(newPassword)) {
      return false;
    }

    return true;
  }

  getResetPasswordPolicyOptions(
    policies: Policy[],
    orgId: string
  ): [ResetPasswordPolicyOptions, boolean] {
    const resetPasswordPolicyOptions = new ResetPasswordPolicyOptions();

    if (policies == null || orgId == null) {
      return [resetPasswordPolicyOptions, false];
    }

    const policy = policies.find(
      (p) => p.organizationId === orgId && p.type === PolicyType.ResetPassword && p.enabled
    );
    resetPasswordPolicyOptions.autoEnrollEnabled = policy?.data?.autoEnrollEnabled ?? false;

    return [resetPasswordPolicyOptions, policy?.enabled ?? false];
  }

  mapPoliciesFromToken(policiesResponse: ListResponse<PolicyResponse>): Policy[] {
    if (policiesResponse == null || policiesResponse.data == null) {
      return null;
    }

    const policiesData = policiesResponse.data.map((p) => new PolicyData(p));
    return policiesData.map((p) => new Policy(p));
  }

  async policyAppliesToUser(
    policyType: PolicyType,
    policyFilter?: (policy: Policy) => boolean,
    userId?: string
  ) {
    const policies = await this.getAll(policyType, userId);
    const organizations = await this.organizationService.getAll(userId);
    let filteredPolicies;

    if (policyFilter != null) {
      filteredPolicies = policies.filter((p) => p.enabled && policyFilter(p));
    } else {
      filteredPolicies = policies.filter((p) => p.enabled);
    }

    const policySet = new Set(filteredPolicies.map((p) => p.organizationId));

    return organizations.some(
      (o) =>
        o.enabled &&
        o.status >= OrganizationUserStatusType.Accepted &&
        o.usePolicies &&
        !this.isExcemptFromPolicies(o, policyType) &&
        policySet.has(o.id)
    );
  }

  private isExcemptFromPolicies(organization: Organization, policyType: PolicyType) {
    if (policyType === PolicyType.MaximumVaultTimeout) {
      return organization.type === OrganizationUserType.Owner;
    }

    return organization.isExemptFromPolicies;
  }
}
