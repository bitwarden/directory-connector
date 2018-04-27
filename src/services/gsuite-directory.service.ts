import { JWT } from 'google-auth-library';
import { google, GoogleApis } from 'googleapis';
import { Admin } from 'googleapis/build/src/apis/admin/directory_v1';

import { DirectoryService } from 'src/services/directory.service';

const PrivateKey = '';
const ClientEmail = '';
const AdminEmail = '';
const Domain = '';

export class GSuiteDirectoryService implements DirectoryService {
    private client: JWT;
    private service: Admin;
    private authParams: any;

    constructor() {
        this.service = google.admin<Admin>('directory_v1');
    }

    async getEntries(force = false) {
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
            email: ClientEmail,
            key: PrivateKey,
            subject: AdminEmail,
            scopes: [
                'https://www.googleapis.com/auth/admin.directory.user.readonly',
                'https://www.googleapis.com/auth/admin.directory.group.readonly',
                'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
            ],
        });

        await this.client.authorize();
        this.authParams = {
            auth: this.client,
            domain: Domain,
        };

        // TODO: add customer?
    }
}
