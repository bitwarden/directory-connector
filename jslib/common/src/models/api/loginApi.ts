import { BaseResponse } from "../response/baseResponse";

import { LoginUriApi } from "./loginUriApi";

export class LoginApi extends BaseResponse {
  uris: LoginUriApi[];
  username: string;
  password: string;
  passwordRevisionDate: string;
  totp: string;
  autofillOnPageLoad: boolean;

  constructor(data: any = null) {
    super(data);
    if (data == null) {
      return;
    }
    this.username = this.getResponseProperty("Username");
    this.password = this.getResponseProperty("Password");
    this.passwordRevisionDate = this.getResponseProperty("PasswordRevisionDate");
    this.totp = this.getResponseProperty("Totp");
    this.autofillOnPageLoad = this.getResponseProperty("AutofillOnPageLoad");

    const uris = this.getResponseProperty("Uris");
    if (uris != null) {
      this.uris = uris.map((u: any) => new LoginUriApi(u));
    }
  }
}
