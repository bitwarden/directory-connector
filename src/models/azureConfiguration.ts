import { IConfiguration } from "./IConfiguration";

export class AzureConfiguration implements IConfiguration {
  identityAuthority: string;
  tenant: string;
  applicationId: string;
  key: string;
}
