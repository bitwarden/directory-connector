import * as graph from '@microsoft/microsoft-graph-client';
import * as https from 'https';
import * as querystring from 'querystring';

import { DirectoryService } from 'src/services/directory.service';

const Key = '';
const ApplicationId = '';
const Tenant = '';

export class AzureDirectoryService implements DirectoryService {
    private client: graph.Client;

    async getEntries(force = false) {
        this.client = graph.Client.init({
            authProvider: (done) => {
                const data = querystring.stringify({
                    client_id: ApplicationId,
                    client_secret: Key,
                    grant_type: 'client_credentials',
                    scope: 'https://graph.microsoft.com/.default',
                });

                const req = https.request({
                    host: 'login.microsoftonline.com',
                    path: '/' + Tenant + '/oauth2/v2.0/token',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(data),
                    },
                }, (res) => {
                    res.setEncoding('utf8');
                    res.on('data', (chunk: string) => {
                        const d = JSON.parse(chunk);
                        if (res.statusCode === 200 && d.access_token != null) {
                            done(null, d.access_token);
                        } else if (d.error != null && d.error_description != null) {
                            done(d.error + ' (' + res.statusCode + '): ' + d.error_description, null);
                        } else {
                            done('Unknown error (' + res.statusCode + ').', null);
                        }
                    });
                }).on('error', (err) => {
                    done(err, null);
                });

                req.write(data);
                req.end();
            },
        });

        await this.getUsers();
        await this.getGroups();
    }

    private async getUsers() {
        const request = this.client.api('/users/delta');
        const users = await request.get();
        console.log(users);
    }

    private async getGroups() {
        const request = this.client.api('/groups/delta');
        const groups = await request.get();
        console.log(groups);

        groups.value.forEach(async (g: any) => {
            const membersRequest = this.client.api('/groups/' + g.id + '/members');
            const members = await membersRequest.get();
            console.log(members);
        });
    }
}
