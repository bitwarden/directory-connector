export class SyncConfiguration {
    users: boolean = false;
    groups: boolean = false;
    interval: number = 5;
    userFilter: string;
    groupFilter: string;
    removeDisabled: boolean = false;
    // Ldap properties
    groupObjectClass: string;
    userObjectClass: string;
    groupPath: string;
    userPath: string;
    groupNameAttribute: string;
    userEmailAttribute: string;
    memberAttribute: string;
    useEmailPrefixSuffix: boolean = false;
    emailPrefixAttribute: string;
    emailSuffix: string;
    creationDateAttribute: string;
    revisionDateAttribute: string;
}
