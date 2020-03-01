export class LdapConfiguration {
    encrypted = false;
    encryptionType: string = 'starttls';
    tlsCaPath: string;
    certDoNotVerify = false;
    sslCertPath: string;
    sslKeyPath: string;
    sslCaPath: string;
    hostname: string;
    port = 389;
    domain: string;
    rootPath: string;
    currentUser = false;
    username: string;
    password: string;
    ad = true;
}
