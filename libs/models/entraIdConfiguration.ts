import { IConfiguration } from "./IConfiguration";

export class EntraIdConfiguration implements IConfiguration {
  identityAuthority: string;
  tenant: string;
  applicationId: string;
  key: string;
}
