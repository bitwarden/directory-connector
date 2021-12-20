import { IConfiguration } from "./IConfiguration";

export class OktaConfiguration implements IConfiguration {
  orgUrl: string;
  token: string;
}
