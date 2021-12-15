import { IConfiguration } from './IConfiguration';

export class GSuiteConfiguration implements IConfiguration {
    clientEmail: string;
    privateKey: string;
    domain: string;
    adminUser: string;
    customer: string;
}
