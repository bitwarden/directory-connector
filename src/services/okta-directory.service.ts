import { DirectoryType } from '../enums/directoryType';

import { GroupEntry } from '../models/groupEntry';
import { OktaConfiguration } from '../models/oktaConfiguration';
import { SyncConfiguration } from '../models/syncConfiguration';
import { UserEntry } from '../models/userEntry';

import { ConfigurationService } from './configuration.service';
import { DirectoryService } from './directory.service';

import { LogService } from 'jslib/abstractions/log.service';

// tslint:disable-next-line
const okta = require('@okta/okta-sdk-nodejs');

export class OktaDirectoryService implements DirectoryService {
    private dirConfig: OktaConfiguration;
    private syncConfig: SyncConfiguration;
    private client: any;

    constructor(private configurationService: ConfigurationService, private logService: LogService) { }

    async getEntries(force: boolean, test: boolean): Promise<[GroupEntry[], UserEntry[]]> {
        const type = await this.configurationService.getDirectoryType();
        if (type !== DirectoryType.Okta) {
            return;
        }

        this.dirConfig = await this.configurationService.getDirectory<OktaConfiguration>(DirectoryType.Okta);
        if (this.dirConfig == null) {
            return;
        }

        this.syncConfig = await this.configurationService.getSync();
        if (this.syncConfig == null) {
            return;
        }

        this.client = new okta.Client({
            orgUrl: this.dirConfig.orgUrl,
            token: this.dirConfig.token,
        });

        let users: UserEntry[];
        if (this.syncConfig.users) {
            users = await this.getUsers(force);
        }

        let groups: GroupEntry[];
        if (this.syncConfig.groups) {
            groups = await this.getGroups(force);
        }

        return [groups, users];
    }

    private async getUsers(force: boolean): Promise<UserEntry[]> {
        const entries: UserEntry[] = [];
        this.logService.info('Querying users.');
        return entries;
    }

    private buildUser(user: any) {
        if ((user.emails == null || user.emails === '') && !user.deleted) {
            return null;
        }

        const entry = new UserEntry();
        return entry;
    }

    private async getGroups(force: boolean): Promise<GroupEntry[]> {
        const entries: GroupEntry[] = [];
        this.logService.info('Querying groups.');
        return entries;
    }

    private async buildGroup(group: any) {
        const entry = new GroupEntry();
        return entry;
    }
}
