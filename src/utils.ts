import { I18nService } from "jslib-common/abstractions/i18n.service";

import { SyncService } from "./services/sync.service";

import { Entry } from "./models/entry";
import { LdapConfiguration } from "./models/ldapConfiguration";
import { SimResult } from "./models/simResult";
import { SyncConfiguration } from "./models/syncConfiguration";
import { UserEntry } from "./models/userEntry";

export class ConnectorUtils {
    static async simulate(
        syncService: SyncService,
        i18nService: I18nService,
        sinceLast: boolean
    ): Promise<SimResult> {
        return new Promise(async (resolve, reject) => {
            const simResult = new SimResult();
            try {
                const result = await syncService.sync(!sinceLast, true);
                if (result[0] != null) {
                    simResult.groups = result[0];
                }
                if (result[1] != null) {
                    simResult.users = result[1];
                }
            } catch (e) {
                simResult.groups = null;
                simResult.users = null;
                reject(e || i18nService.t("syncError"));
                return;
            }

            const userMap = new Map<string, UserEntry>();
            this.sortEntries(simResult.users, i18nService);
            for (const u of simResult.users) {
                userMap.set(u.externalId, u);
                if (u.deleted) {
                    simResult.deletedUsers.push(u);
                } else if (u.disabled) {
                    simResult.disabledUsers.push(u);
                } else {
                    simResult.enabledUsers.push(u);
                }
            }

            this.sortEntries(simResult.groups, i18nService);
            for (const g of simResult.groups) {
                if (g.userMemberExternalIds == null) {
                    continue;
                }

                const anyG = g as any;
                anyG.users = [];
                for (const uid of g.userMemberExternalIds) {
                    if (userMap.has(uid)) {
                        anyG.users.push(userMap.get(uid));
                    } else {
                        anyG.users.push({ displayName: uid });
                    }
                }

                this.sortEntries(anyG.users, i18nService);
            }

            resolve(simResult);
        });
    }

    static adjustConfigForSave(ldap: LdapConfiguration, sync: SyncConfiguration) {
        if (ldap.ad) {
            sync.creationDateAttribute = "whenCreated";
            sync.revisionDateAttribute = "whenChanged";
            sync.emailPrefixAttribute = "sAMAccountName";
            sync.memberAttribute = "member";
            sync.userObjectClass = "person";
            sync.groupObjectClass = "group";
            sync.userEmailAttribute = "mail";
            sync.groupNameAttribute = "name";

            if (sync.groupPath == null) {
                sync.groupPath = "CN=Users";
            }
            if (sync.userPath == null) {
                sync.userPath = "CN=Users";
            }
        }

        if (sync.interval != null) {
            if (sync.interval <= 0) {
                sync.interval = null;
            } else if (sync.interval < 5) {
                sync.interval = 5;
            }
        }
    }

    private static sortEntries(arr: Entry[], i18nService: I18nService) {
        arr.sort((a, b) => {
            return i18nService.collator
                ? i18nService.collator.compare(a.displayName, b.displayName)
                : a.displayName.localeCompare(b.displayName);
        });
    }
}
