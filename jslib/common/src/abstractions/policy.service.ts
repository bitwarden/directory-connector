import { PolicyType } from "../enums/policyType";
import { PolicyData } from "../models/data/policyData";
import { MasterPasswordPolicyOptions } from "../models/domain/masterPasswordPolicyOptions";
import { Policy } from "../models/domain/policy";
import { ResetPasswordPolicyOptions } from "../models/domain/resetPasswordPolicyOptions";
import { ListResponse } from "../models/response/listResponse";
import { PolicyResponse } from "../models/response/policyResponse";

export abstract class PolicyService {
  clearCache: () => void;
  getAll: (type?: PolicyType, userId?: string) => Promise<Policy[]>;
  getPolicyForOrganization: (policyType: PolicyType, organizationId: string) => Promise<Policy>;
  replace: (policies: { [id: string]: PolicyData }) => Promise<any>;
  clear: (userId?: string) => Promise<any>;
  getMasterPasswordPoliciesForInvitedUsers: (orgId: string) => Promise<MasterPasswordPolicyOptions>;
  getMasterPasswordPolicyOptions: (policies?: Policy[]) => Promise<MasterPasswordPolicyOptions>;
  evaluateMasterPassword: (
    passwordStrength: number,
    newPassword: string,
    enforcedPolicyOptions?: MasterPasswordPolicyOptions
  ) => boolean;
  getResetPasswordPolicyOptions: (
    policies: Policy[],
    orgId: string
  ) => [ResetPasswordPolicyOptions, boolean];
  mapPoliciesFromToken: (policiesResponse: ListResponse<PolicyResponse>) => Policy[];
  policyAppliesToUser: (
    policyType: PolicyType,
    policyFilter?: (policy: Policy) => boolean,
    userId?: string
  ) => Promise<boolean>;
}
