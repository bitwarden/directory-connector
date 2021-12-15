import { IConfiguration } from './IConfiguration';

export class OneLoginConfiguration implements IConfiguration {
    clientId: string;
    clientSecret: string;
    region = 'us';
}
