import { GroupEntry } from '../groupEntry';

export class GroupResponse {
    externalId: string;
    displayName: string;
    userIds: string[];

    constructor(g: GroupEntry) {
        this.externalId = g.externalId;
        this.displayName = g.displayName;
        this.userIds = Array.from(g.userMemberExternalIds);
    }
}
