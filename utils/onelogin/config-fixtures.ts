import { OneLoginConfiguration } from "@/libs/models/oneLoginConfiguration";
import { SyncConfiguration } from "@/libs/models/syncConfiguration";

/**
 * @returns a basic OneLogin configuration. Can be overridden by passing in a partial configuration.
 */
export const getOneLoginConfiguration = (
  config?: Partial<OneLoginConfiguration>,
): OneLoginConfiguration => {
  const clientId = process.env.ONELOGIN_CLIENT_ID;
  const clientSecret = process.env.ONELOGIN_CLIENT_SECRET;
  const region = process.env.ONELOGIN_REGION ?? "us";

  if (!clientId || !clientSecret) {
    throw new Error("OneLogin integration test credentials not configured.");
  }

  return {
    clientId,
    clientSecret,
    region,
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
