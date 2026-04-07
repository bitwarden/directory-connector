export class SyncConfiguration {
  users = false;
  groups = false;
  interval = 5;
  userFilter: string;
  groupFilter: string;
  removeDisabled = false;
  overwriteExisting = false;
  largeImport = false;
  // Ldap properties
  groupObjectClass: string;
  userObjectClass: string;
  groupPath: string;
  userPath: string;
  groupNameAttribute: string;
  userEmailAttribute: string;
  memberAttribute: string;
  useEmailPrefixSuffix = false;
  emailPrefixAttribute: string;
  emailSuffix: string;
  creationDateAttribute: string;
  revisionDateAttribute: string;
}
