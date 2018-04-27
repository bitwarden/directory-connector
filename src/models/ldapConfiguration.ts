import { DirectoryType } from '../enums/directoryType';

export class LdapConfiguration {
    ssl: boolean = false;
    hostname: string;
    port: number = 389;
    domain: string;
    rootPath: string;
    currentUser: boolean = false;
    username: string;
    password: string;
    ad: boolean = true;
}
