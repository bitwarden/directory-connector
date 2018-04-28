import * as ldap from 'ldapjs';

import { DirectoryType } from '../enums/directoryType';

import { GroupEntry } from '../models/groupEntry';
import { LdapConfiguration } from '../models/ldapConfiguration';
import { SyncConfiguration } from '../models/syncConfiguration';
import { UserEntry } from '../models/userEntry';

import { ConfigurationService } from './configuration.service';
import { DirectoryService } from './directory.service';

export class LdapDirectoryService implements DirectoryService {
    private client: ldap.Client;
    private dirConfig: LdapConfiguration;
    private syncConfig: SyncConfiguration;

    constructor(private configurationService: ConfigurationService) { }

    async getEntries(force = false): Promise<[GroupEntry[], UserEntry[]]> {
        const type = await this.configurationService.getDirectoryType();
        if (type !== DirectoryType.Ldap) {
            return;
        }

        this.dirConfig = await this.configurationService.getDirectory<LdapConfiguration>(DirectoryType.Ldap);
        if (this.dirConfig == null) {
            return;
        }

        this.syncConfig = await this.configurationService.getSync();
        if (this.syncConfig == null) {
            return;
        }

        await this.auth();
        await this.getUsers();

        return null;
    }

    private getUsers() {
        const options: ldap.SearchOptions = {
            filter: null,
            scope: 'sub',
            attributes: ['dn', 'sn', 'cn'],
        };

        return new Promise((resolve, reject) => {
            this.client.search('dc=example,dc=com', options, (err, res) => {
                if (err != null) {
                    console.error('search error: ' + err);
                    reject(err);
                    return;
                }
                res.on('searchEntry', (entry) => {
                    console.log(entry);
                });
                res.on('searchReference', (referral) => {
                    console.log('referral: ' + referral.uris.join());
                });
                res.on('error', (resErr) => {
                    console.error('error: ' + resErr.message);
                    reject(resErr);
                });
                res.on('end', (result) => {
                    console.log('status: ' + result.status);
                });

                resolve();
            });
        });
    }

    private async auth() {
        return new Promise((resolve, reject) => {
            const url = 'ldap' + (this.dirConfig.ssl ? 's' : '') + '://' + this.dirConfig.hostname +
                ':' + this.dirConfig.port;
            this.client = ldap.createClient({
                url: url,
            });

            this.client.bind(this.dirConfig.username, this.dirConfig.password, (err) => {
                if (err != null) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}
