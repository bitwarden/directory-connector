import { Entry } from './entry';

export class UserEntry extends Entry {
    email: string;
    disabled = false;
    deleted = false;
}
