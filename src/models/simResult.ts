import { GroupEntry } from './groupEntry';
import { UserEntry } from './userEntry';

export class SimResult {
    groups: GroupEntry[] = [];
    users: UserEntry[] = [];
    enabledUsers: UserEntry[] = [];
    disabledUsers: UserEntry[] = [];
    deletedUsers: UserEntry[] = [];
}
