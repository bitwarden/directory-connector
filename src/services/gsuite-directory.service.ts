import { google, GoogleApis } from 'googleapis';
import { Admin } from 'googleapis/build/src/apis/admin/directory_v1';

import { DirectoryService } from 'src/services/directory.service';

export class GSuiteDirectoryService implements DirectoryService {
    getEntries(force = false) {
    }

    private async getUsers() {
        const service = google.admin<Admin>('directory_v1');
        const groups = await service.groups.list();
    }
}
