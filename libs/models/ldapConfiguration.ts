import { IConfiguration } from "./IConfiguration";

export class LdapConfiguration implements IConfiguration {
  /**
   * Unique identifier for this specific configuration (generated automatically). Used to scope
   * the secure-storage entry for `password` so that distinct configurations - e.g. two AD service
   * accounts used for multi-directory sync - never share (or overwrite) each other's secret, even
   * if their `data.json` files are swapped in and out on the same machine.
   */
  id?: string;
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
