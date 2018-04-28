import { Entry } from './entry';

export class GroupEntry extends Entry {
    name: string;
    userMemberExternalIds = new Set<string>();
    groupMemberReferenceIds = new Set<string>();
}
