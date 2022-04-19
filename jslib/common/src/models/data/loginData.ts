import { LoginApi } from "../api/loginApi";

import { LoginUriData } from "./loginUriData";

export class LoginData {
  uris: LoginUriData[];
  username: string;
  password: string;
  passwordRevisionDate: string;
  totp: string;
  autofillOnPageLoad: boolean;

  constructor(data?: LoginApi) {
    if (data == null) {
      return;
    }

    this.username = data.username;
    this.password = data.password;
    this.passwordRevisionDate = data.passwordRevisionDate;
    this.totp = data.totp;
    this.autofillOnPageLoad = data.autofillOnPageLoad;

    if (data.uris) {
      this.uris = data.uris.map((u) => new LoginUriData(u));
    }
  }
}
