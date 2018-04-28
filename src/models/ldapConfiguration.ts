import { DirectoryType } from '../enums/directoryType';

export class LdapConfiguration {
    ssl = false;
    hostname: string;
    port = 389;
    domain: string;
    rootPath: string;
    currentUser = false;
    username: string;
    password: string;
    ad = true;
}
