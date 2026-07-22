import { IConfiguration } from "./IConfiguration";

export class OneLoginConfiguration implements IConfiguration {
  /** Unique identifier for this specific configuration (generated automatically). See LdapConfiguration.id. */
  id?: string;
  clientId: string;
  clientSecret: string;
  region = "us";
}
