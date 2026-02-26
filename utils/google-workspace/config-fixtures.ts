import { GSuiteConfiguration } from "@/libs/models/gsuiteConfiguration";
import { SyncConfiguration } from "@/libs/models/syncConfiguration";

/**
 * @returns a basic GSuite configuration. Can be overridden by passing in a partial configuration.
 */
export const getGSuiteConfiguration = (
  config?: Partial<GSuiteConfiguration>,
): GSuiteConfiguration => {
  const adminUser = process.env.GOOGLE_ADMIN_USER;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const domain = process.env.GOOGLE_DOMAIN;

  if (!adminUser || !clientEmail || !privateKey || !domain) {
    throw new Error("Google Workspace integration test credentials not configured.");
  }

  return {
    // TODO
    adminUser,
    clientEmail,
    privateKey,
    domain: domain,
    customer: "",
    ...(config ?? {}),
  };
};

/**
 * @returns a basic Google Workspace sync configuration. Can be overridden by passing in a partial configuration.
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
