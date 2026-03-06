import { ApiTokenRequest } from "@/jslib/common/src/models/request/identityToken/apiTokenRequest";
import { PasswordTokenRequest } from "@/jslib/common/src/models/request/identityToken/passwordTokenRequest";
import { SsoTokenRequest } from "@/jslib/common/src/models/request/identityToken/ssoTokenRequest";
import { OrganizationImportRequest } from "@/jslib/common/src/models/request/organizationImportRequest";
import { IdentityCaptchaResponse } from "@/jslib/common/src/models/response/identityCaptchaResponse";
import { IdentityTokenResponse } from "@/jslib/common/src/models/response/identityTokenResponse";
import { IdentityTwoFactorResponse } from "@/jslib/common/src/models/response/identityTwoFactorResponse";

export abstract class ApiService {
  postIdentityToken: (
    request: PasswordTokenRequest | SsoTokenRequest | ApiTokenRequest,
  ) => Promise<IdentityTokenResponse | IdentityTwoFactorResponse | IdentityCaptchaResponse>;
  postPublicImportDirectory: (request: OrganizationImportRequest) => Promise<any>;
}
