import { IConfiguration } from "./IConfiguration";

export class OktaConfiguration implements IConfiguration {
  /** Unique identifier for this specific configuration (generated automatically). See LdapConfiguration.id. */
  id?: string;
  orgUrl: string;
  token: string;
}
