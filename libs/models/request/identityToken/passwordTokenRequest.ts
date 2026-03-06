import { ClientType } from "@/libs/enums/clientType";
import { CaptchaProtectedRequest } from "@/libs/models/request/captchaProtectedRequest";
import { DeviceRequest } from "@/libs/models/request/deviceRequest";
import { TokenRequest } from "@/libs/models/request/identityToken/tokenRequest";
import { TokenRequestTwoFactor } from "@/libs/models/request/identityToken/tokenRequestTwoFactor";

export class PasswordTokenRequest extends TokenRequest implements CaptchaProtectedRequest {
  constructor(
    public email: string,
    public masterPasswordHash: string,
    public captchaResponse: string,
    protected twoFactor: TokenRequestTwoFactor,
    device?: DeviceRequest,
  ) {
    super(twoFactor, device);
  }

  toIdentityToken(clientId: ClientType) {
    const obj = super.toIdentityToken(clientId);

    obj.grant_type = "password";
    obj.username = this.email;
    obj.password = this.masterPasswordHash;

    if (this.captchaResponse != null) {
      obj.captchaResponse = this.captchaResponse;
    }

    return obj;
  }
}
