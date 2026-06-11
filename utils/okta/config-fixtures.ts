import { OktaConfiguration } from "@/libs/models/oktaConfiguration";
import { SyncConfiguration } from "@/libs/models/syncConfiguration";

/**
 * @returns a basic Okta configuration. Can be overridden by passing in a partial configuration.
 */
export const getOktaConfiguration = (config?: Partial<OktaConfiguration>): OktaConfiguration => {
  const orgUrl = process.env.OKTA_ORG_URL;
  const token = process.env.OKTA_TOKEN;

  if (!orgUrl || !token) {
    throw new Error("Okta integration test credentials not configured.");
  }

  return {
    orgUrl,
    token,
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
