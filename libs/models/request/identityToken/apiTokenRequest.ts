import { DeviceRequest } from "@/libs/models/request/deviceRequest";
import { TokenRequest } from "@/libs/models/request/identityToken/tokenRequest";
import { TokenRequestTwoFactor } from "@/libs/models/request/identityToken/tokenRequestTwoFactor";

export class ApiTokenRequest extends TokenRequest {
  constructor(
    public clientId: string,
    public clientSecret: string,
    protected twoFactor: TokenRequestTwoFactor,
    device?: DeviceRequest,
  ) {
    super(twoFactor, device);
  }

  toIdentityToken() {
    const obj = super.toIdentityToken(this.clientId);

    obj.scope = this.clientId.startsWith("organization") ? "api.organization" : "api";
    obj.grant_type = "client_credentials";
    obj.client_secret = this.clientSecret;

    return obj;
  }
}
