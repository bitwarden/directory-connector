import * as ldap from 'ldapjs';

import { DirectoryService } from 'src/services/directory.service';

export class LdapDirectoryService implements DirectoryService {
    getEntries(force = false) {
    }

    private getUsers() {
        const client = ldap.createClient({
            url: 'ldap://127.0.0.1:1389'
        });

        const options: ldap.SearchOptions = {
            filter: '(&(l=Seattle)(email=*@foo.com))',
            scope: 'sub',
            attributes: ['dn', 'sn', 'cn']
        };

        client.search('o=example', options, (error, response) => {
            if (error != null) {

            }

            response.on('searchEntry', (entry) => {
                console.log('entry: ' + JSON.stringify(entry.object));
            });
            response.on('searchReference', (referral) => {
                console.log('referral: ' + referral.uris.join());
            });
            response.on('error', (err) => {
                console.error('error: ' + err.message);
            });
            response.on('end', (result) => {
                console.log('status: ' + result.status);
            });
        });
    }
}
