import { IConfiguration } from "./IConfiguration";

export class GSuiteConfiguration implements IConfiguration {
  /** Unique identifier for this specific configuration (generated automatically). See LdapConfiguration.id. */
  id?: string;
  clientEmail: string;
  privateKey: string;
  domain: string;
  adminUser: string;
  customer: string;
}
