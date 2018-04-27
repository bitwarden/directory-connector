import { JWT } from 'google-auth-library';
import { google, GoogleApis } from 'googleapis';
import { Admin } from 'googleapis/build/src/apis/admin/directory_v1';

import { DirectoryType } from '../enums/directoryType';

import { GSuiteConfiguration } from '../models/gsuiteConfiguration';
import { SyncConfiguration } from '../models/syncConfiguration';

import { ConfigurationService } from './configuration.service';
import { DirectoryService } from './directory.service';

export class GSuiteDirectoryService implements DirectoryService {
    private client: JWT;
    private service: Admin;
    private authParams: any;
    private dirConfig: GSuiteConfiguration;
    private syncConfig: SyncConfiguration;

    constructor(private configurationService: ConfigurationService) {
        this.service = google.admin<Admin>('directory_v1');
    }

    async getEntries(force = false) {
        const type = await this.configurationService.getDirectoryType();
        if (type !== DirectoryType.GSuite) {
            return;
        }

        this.dirConfig = await this.configurationService.getDirectory<GSuiteConfiguration>(DirectoryType.GSuite);
        if (this.dirConfig == null) {
            return;
        }

        this.syncConfig = await this.configurationService.getSync();
        if (this.syncConfig == null) {
            return;
        }

        await this.auth();
        await this.getUsers();
        await this.getGroups();
    }

    private async getUsers() {
        const response = await this.service.users.list(this.authParams);
        console.log(response);
    }

    private async getGroups() {
        const response = await this.service.groups.list(this.authParams);
        console.log(response);

        if (response.data.groups.length === 0) {
            return;
        }

        response.data.groups.forEach(async (g) => {
            const params: any = Object.assign({
                groupKey: g.id,
            }, this.authParams);
            const members = await this.service.members.list(params);
            console.log(members);
        });
    }

    private async auth() {
        this.client = new google.auth.JWT({
            email: this.dirConfig.clientEmail,
            key: this.dirConfig.privateKey,
            subject: this.dirConfig.adminUser,
            scopes: [
                'https://www.googleapis.com/auth/admin.directory.user.readonly',
                'https://www.googleapis.com/auth/admin.directory.group.readonly',
                'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
            ],
        });

        await this.client.authorize();

        this.authParams = {
            auth: this.client,
            domain: this.dirConfig.domain,
        };
        if (this.dirConfig.customer != null) {
            this.authParams.customer = this.dirConfig.customer;
        }
    }
}
