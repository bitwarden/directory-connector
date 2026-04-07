import { ApiTokenRequest } from "@/libs/models/request/identityToken/apiTokenRequest";
import { PasswordTokenRequest } from "@/libs/models/request/identityToken/passwordTokenRequest";
import { SsoTokenRequest } from "@/libs/models/request/identityToken/ssoTokenRequest";
import { OrganizationImportRequest } from "@/libs/models/request/organizationImportRequest";
import { IdentityCaptchaResponse } from "@/libs/models/response/identityCaptchaResponse";
import { IdentityTokenResponse } from "@/libs/models/response/identityTokenResponse";
import { IdentityTwoFactorResponse } from "@/libs/models/response/identityTwoFactorResponse";

export abstract class ApiService {
  postIdentityToken: (
    request: PasswordTokenRequest | SsoTokenRequest | ApiTokenRequest,
  ) => Promise<IdentityTokenResponse | IdentityTwoFactorResponse | IdentityCaptchaResponse>;
  postPublicImportDirectory: (request: OrganizationImportRequest) => Promise<any>;
}
