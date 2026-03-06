import { DeviceRequest } from "@/libs/models/request/deviceRequest";
import { TokenRequest } from "@/libs/models/request/identityToken/tokenRequest";
import { TokenRequestTwoFactor } from "@/libs/models/request/identityToken/tokenRequestTwoFactor";

export class SsoTokenRequest extends TokenRequest {
  constructor(
    public code: string,
    public codeVerifier: string,
    public redirectUri: string,
    protected twoFactor: TokenRequestTwoFactor,
    device?: DeviceRequest,
  ) {
    super(twoFactor, device);
  }

  toIdentityToken(clientId: string) {
    const obj = super.toIdentityToken(clientId);

    obj.grant_type = "authorization_code";
    obj.code = this.code;
    obj.code_verifier = this.codeVerifier;
    obj.redirect_uri = this.redirectUri;

    return obj;
  }
}
