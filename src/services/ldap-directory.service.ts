import * as ldap from 'ldapjs';

import { DirectoryService } from 'src/services/directory.service';

const Url = 'ldap://ldap.forumsys.com:389';
const Username = 'cn=read-only-admin,dc=example,dc=com';
const Password = 'password';

export class LdapDirectoryService implements DirectoryService {
    private client: ldap.Client;

    async getEntries(force = false) {
        await this.auth();
        await this.getUsers();
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
            this.client = ldap.createClient({
                url: Url,
            });

            this.client.bind(Username, Password, (err) => {
                if (err != null) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}
