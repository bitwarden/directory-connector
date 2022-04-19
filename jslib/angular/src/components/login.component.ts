import { Directive, Input, NgZone, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { take } from "rxjs/operators";

import { AuthService } from "jslib-common/abstractions/auth.service";
import { CryptoFunctionService } from "jslib-common/abstractions/cryptoFunction.service";
import { EnvironmentService } from "jslib-common/abstractions/environment.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { LogService } from "jslib-common/abstractions/log.service";
import { PasswordGenerationService } from "jslib-common/abstractions/passwordGeneration.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { StateService } from "jslib-common/abstractions/state.service";
import { Utils } from "jslib-common/misc/utils";
import { AuthResult } from "jslib-common/models/domain/authResult";
import { PasswordLogInCredentials } from "jslib-common/models/domain/logInCredentials";

import { CaptchaProtectedComponent } from "./captchaProtected.component";

@Directive()
export class LoginComponent extends CaptchaProtectedComponent implements OnInit {
  @Input() email = "";
  @Input() rememberEmail = true;

  masterPassword = "";
  showPassword = false;
  formPromise: Promise<AuthResult>;
  onSuccessfulLogin: () => Promise<any>;
  onSuccessfulLoginNavigate: () => Promise<any>;
  onSuccessfulLoginTwoFactorNavigate: () => Promise<any>;
  onSuccessfulLoginForceResetNavigate: () => Promise<any>;

  protected twoFactorRoute = "2fa";
  protected successRoute = "vault";
  protected forcePasswordResetRoute = "update-temp-password";
  protected alwaysRememberEmail = false;

  constructor(
    protected authService: AuthService,
    protected router: Router,
    platformUtilsService: PlatformUtilsService,
    i18nService: I18nService,
    protected stateService: StateService,
    environmentService: EnvironmentService,
    protected passwordGenerationService: PasswordGenerationService,
    protected cryptoFunctionService: CryptoFunctionService,
    protected logService: LogService,
    protected ngZone: NgZone
  ) {
    super(environmentService, i18nService, platformUtilsService);
  }

  async ngOnInit() {
    if (this.email == null || this.email === "") {
      this.email = await this.stateService.getRememberedEmail();
      if (this.email == null) {
        this.email = "";
      }
    }
    if (!this.alwaysRememberEmail) {
      this.rememberEmail = (await this.stateService.getRememberedEmail()) != null;
    }
    if (Utils.isBrowser && !Utils.isNode) {
      this.focusInput();
    }
  }

  async submit() {
    await this.setupCaptcha();

    if (this.email == null || this.email === "") {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("emailRequired")
      );
      return;
    }
    if (this.email.indexOf("@") === -1) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("invalidEmail")
      );
      return;
    }
    if (this.masterPassword == null || this.masterPassword === "") {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("masterPassRequired")
      );
      return;
    }

    try {
      const credentials = new PasswordLogInCredentials(
        this.email,
        this.masterPassword,
        this.captchaToken,
        null
      );
      this.formPromise = this.authService.logIn(credentials);
      const response = await this.formPromise;
      if (this.rememberEmail || this.alwaysRememberEmail) {
        await this.stateService.setRememberedEmail(this.email);
      } else {
        await this.stateService.setRememberedEmail(null);
      }
      if (this.handleCaptchaRequired(response)) {
        return;
      } else if (response.requiresTwoFactor) {
        if (this.onSuccessfulLoginTwoFactorNavigate != null) {
          this.onSuccessfulLoginTwoFactorNavigate();
        } else {
          this.router.navigate([this.twoFactorRoute]);
        }
      } else if (response.forcePasswordReset) {
        if (this.onSuccessfulLoginForceResetNavigate != null) {
          this.onSuccessfulLoginForceResetNavigate();
        } else {
          this.router.navigate([this.forcePasswordResetRoute]);
        }
      } else {
        const disableFavicon = await this.stateService.getDisableFavicon();
        await this.stateService.setDisableFavicon(!!disableFavicon);
        if (this.onSuccessfulLogin != null) {
          this.onSuccessfulLogin();
        }
        if (this.onSuccessfulLoginNavigate != null) {
          this.onSuccessfulLoginNavigate();
        } else {
          this.router.navigate([this.successRoute]);
        }
      }
    } catch (e) {
      this.logService.error(e);
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
    if (this.ngZone.isStable) {
      document.getElementById("masterPassword").focus();
    } else {
      this.ngZone.onStable
        .pipe(take(1))
        .subscribe(() => document.getElementById("masterPassword").focus());
    }
  }

  async launchSsoBrowser(clientId: string, ssoRedirectUri: string) {
    // Generate necessary sso params
    const passwordOptions: any = {
      type: "password",
      length: 64,
      uppercase: true,
      lowercase: true,
      numbers: true,
      special: false,
    };
    const state = await this.passwordGenerationService.generatePassword(passwordOptions);
    const ssoCodeVerifier = await this.passwordGenerationService.generatePassword(passwordOptions);
    const codeVerifierHash = await this.cryptoFunctionService.hash(ssoCodeVerifier, "sha256");
    const codeChallenge = Utils.fromBufferToUrlB64(codeVerifierHash);

    // Save sso params
    await this.stateService.setSsoState(state);
    await this.stateService.setSsoCodeVerifier(ssoCodeVerifier);

    // Build URI
    const webUrl = this.environmentService.getWebVaultUrl();

    // Launch browser
    this.platformUtilsService.launchUri(
      webUrl +
        "/#/sso?clientId=" +
        clientId +
        "&redirectUri=" +
        encodeURIComponent(ssoRedirectUri) +
        "&state=" +
        state +
        "&codeChallenge=" +
        codeChallenge
    );
  }

  protected focusInput() {
    document
      .getElementById(this.email == null || this.email === "" ? "email" : "masterPassword")
      .focus();
  }
}
