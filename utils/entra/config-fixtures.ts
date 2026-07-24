import { EntraIdConfiguration } from "@/libs/models/entraIdConfiguration";
import { SyncConfiguration } from "@/libs/models/syncConfiguration";

/**
 * @returns a basic Entra ID configuration. Can be overridden by passing in a partial configuration.
 */
export const getEntraIdConfiguration = (
  config?: Partial<EntraIdConfiguration>,
): EntraIdConfiguration => {
  const tenant = process.env.ENTRA_TENANT_ID;
  const applicationId = process.env.ENTRA_APPLICATION_ID;
  const key = process.env.ENTRA_KEY;

  if (!tenant || !applicationId || !key) {
    throw new Error("Entra ID integration test credentials not configured.");
  }

  return {
    identityAuthority: "login.microsoftonline.com",
    tenant,
    applicationId,
    key,
    ...(config ?? {}),
  };
};

/**
 * @returns a basic sync configuration. Can be overridden by passing in a partial configuration.
 */
export const getSyncConfiguration = (config?: Partial<SyncConfiguration>): SyncConfiguration => ({
  users: false,
  groups: false,
  interval: 5,
  userFilter: "",
  groupFilter: "",
  removeDisabled: false,
  overwriteExisting: false,
  largeImport: false,
  inviteUsersAfterProvisioning: false,
  // Ldap properties - not optional for some reason
  groupObjectClass: "",
  userObjectClass: "",
  groupPath: null,
  userPath: null,
  groupNameAttribute: "",
  userEmailAttribute: "",
  memberAttribute: "",
  useEmailPrefixSuffix: false,
  emailPrefixAttribute: "",
  emailSuffix: null,
  creationDateAttribute: "",
  revisionDateAttribute: "",
  ...(config ?? {}),
});
