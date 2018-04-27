import * as graph from '@microsoft/microsoft-graph-client';
import * as https from 'https';
import * as querystring from 'querystring';

import { DirectoryType } from '../enums/directoryType';

import { AzureConfiguration } from '../models/azureConfiguration';
import { SyncConfiguration } from '../models/syncConfiguration';

import { ConfigurationService } from './configuration.service';
import { DirectoryService } from './directory.service';

export class AzureDirectoryService implements DirectoryService {
    private client: graph.Client;
    private dirConfig: AzureConfiguration;
    private syncConfig: SyncConfiguration;

    constructor(private configurationService: ConfigurationService) {
        this.client = graph.Client.init({
            authProvider: (done) => {
                const data = querystring.stringify({
                    client_id: this.dirConfig.applicationId,
                    client_secret: this.dirConfig.key,
                    grant_type: 'client_credentials',
                    scope: 'https://graph.microsoft.com/.default',
                });

                const req = https.request({
                    host: 'login.microsoftonline.com',
                    path: '/' + this.dirConfig.tenant + '/oauth2/v2.0/token',
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
    }

    async getEntries(force = false) {
        const type = await this.configurationService.getDirectoryType();
        if (type !== DirectoryType.AzureActiveDirectory) {
            return;
        }

        this.dirConfig = await this.configurationService.getDirectory<AzureConfiguration>(
            DirectoryType.AzureActiveDirectory);
        if (this.dirConfig == null) {
            return;
        }

        this.syncConfig = await this.configurationService.getSync();
        if (this.syncConfig == null) {
            return;
        }

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
