import { Entry } from './entry';

export class UserEntry extends Entry {
    email: string;
    disabled = false;
    deleted = false;

    get displayName(): string {
        if (this.email == null) {
            return this.referenceId;
        }

        return this.email;
    }
}
