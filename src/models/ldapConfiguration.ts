export class LdapConfiguration {
  ssl = false;
  startTls = false;
  tlsCaPath: string;
  sslAllowUnauthorized = false;
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
  pagedSearch = true;
}
