import { IConfiguration } from "./IConfiguration";

export class EntraIdConfiguration implements IConfiguration {
  /** Unique identifier for this specific configuration (generated automatically). See LdapConfiguration.id. */
  id?: string;
  identityAuthority: string;
  tenant: string;
  applicationId: string;
  key: string;
}
