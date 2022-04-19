import { BaseResponse } from "./baseResponse";
import { ProfileOrganizationResponse } from "./profileOrganizationResponse";
import { ProfileProviderOrganizationResponse } from "./profileProviderOrganizationResponse";
import { ProfileProviderResponse } from "./profileProviderResponse";

export class ProfileResponse extends BaseResponse {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  masterPasswordHint: string;
  premium: boolean;
  culture: string;
  twoFactorEnabled: boolean;
  key: string;
  privateKey: string;
  securityStamp: string;
  forcePasswordReset: boolean;
  usesKeyConnector: boolean;
  organizations: ProfileOrganizationResponse[] = [];
  providers: ProfileProviderResponse[] = [];
  providerOrganizations: ProfileProviderOrganizationResponse[] = [];

  constructor(response: any) {
    super(response);
    this.id = this.getResponseProperty("Id");
    this.name = this.getResponseProperty("Name");
    this.email = this.getResponseProperty("Email");
    this.emailVerified = this.getResponseProperty("EmailVerified");
    this.masterPasswordHint = this.getResponseProperty("MasterPasswordHint");
    this.premium = this.getResponseProperty("Premium");
    this.culture = this.getResponseProperty("Culture");
    this.twoFactorEnabled = this.getResponseProperty("TwoFactorEnabled");
    this.key = this.getResponseProperty("Key");
    this.privateKey = this.getResponseProperty("PrivateKey");
    this.securityStamp = this.getResponseProperty("SecurityStamp");
    this.forcePasswordReset = this.getResponseProperty("ForcePasswordReset") ?? false;
    this.usesKeyConnector = this.getResponseProperty("UsesKeyConnector") ?? false;

    const organizations = this.getResponseProperty("Organizations");
    if (organizations != null) {
      this.organizations = organizations.map((o: any) => new ProfileOrganizationResponse(o));
    }
    const providers = this.getResponseProperty("Providers");
    if (providers != null) {
      this.providers = providers.map((o: any) => new ProfileProviderResponse(o));
    }
    const providerOrganizations = this.getResponseProperty("ProviderOrganizations");
    if (providerOrganizations != null) {
      this.providerOrganizations = providerOrganizations.map(
        (o: any) => new ProfileProviderOrganizationResponse(o)
      );
    }
  }
}
