import { ApiTokenRequest } from "../models/request/identityToken/apiTokenRequest";
import { PasswordTokenRequest } from "../models/request/identityToken/passwordTokenRequest";
import { SsoTokenRequest } from "../models/request/identityToken/ssoTokenRequest";
import { OrganizationImportRequest } from "../models/request/organizationImportRequest";
import { IdentityCaptchaResponse } from '../models/response/identityCaptchaResponse';
import { IdentityTokenResponse } from '../models/response/identityTokenResponse';
import { IdentityTwoFactorResponse } from '../models/response/identityTwoFactorResponse';

export abstract class ApiService {
  postIdentityToken: (
    request: PasswordTokenRequest | SsoTokenRequest | ApiTokenRequest,
  ) => Promise<IdentityTokenResponse | IdentityTwoFactorResponse | IdentityCaptchaResponse>;
  postPublicImportDirectory: (request: OrganizationImportRequest) => Promise<any>;
}
