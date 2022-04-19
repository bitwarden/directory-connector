import { Directive } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { first } from "rxjs/operators";

import { ApiService } from "jslib-common/abstractions/api.service";
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
import { SsoLogInCredentials } from "jslib-common/models/domain/logInCredentials";

@Directive()
export class SsoComponent {
  identifier: string;
  loggingIn = false;

  formPromise: Promise<AuthResult>;
  initiateSsoFormPromise: Promise<any>;
  onSuccessfulLogin: () => Promise<any>;
  onSuccessfulLoginNavigate: () => Promise<any>;
  onSuccessfulLoginTwoFactorNavigate: () => Promise<any>;
  onSuccessfulLoginChangePasswordNavigate: () => Promise<any>;
  onSuccessfulLoginForceResetNavigate: () => Promise<any>;

  protected twoFactorRoute = "2fa";
  protected successRoute = "lock";
  protected changePasswordRoute = "set-password";
  protected forcePasswordResetRoute = "update-temp-password";
  protected clientId: string;
  protected redirectUri: string;
  protected state: string;
  protected codeChallenge: string;

  constructor(
    protected authService: AuthService,
    protected router: Router,
    protected i18nService: I18nService,
    protected route: ActivatedRoute,
    protected stateService: StateService,
    protected platformUtilsService: PlatformUtilsService,
    protected apiService: ApiService,
    protected cryptoFunctionService: CryptoFunctionService,
    protected environmentService: EnvironmentService,
    protected passwordGenerationService: PasswordGenerationService,
    protected logService: LogService
  ) {}

  async ngOnInit() {
    this.route.queryParams.pipe(first()).subscribe(async (qParams) => {
      if (qParams.code != null && qParams.state != null) {
        const codeVerifier = await this.stateService.getSsoCodeVerifier();
        const state = await this.stateService.getSsoState();
        await this.stateService.setSsoCodeVerifier(null);
        await this.stateService.setSsoState(null);
        if (
          qParams.code != null &&
          codeVerifier != null &&
          state != null &&
          this.checkState(state, qParams.state)
        ) {
          await this.logIn(
            qParams.code,
            codeVerifier,
            this.getOrgIdentifierFromState(qParams.state)
          );
        }
      } else if (
        qParams.clientId != null &&
        qParams.redirectUri != null &&
        qParams.state != null &&
        qParams.codeChallenge != null
      ) {
        this.redirectUri = qParams.redirectUri;
        this.state = qParams.state;
        this.codeChallenge = qParams.codeChallenge;
        this.clientId = qParams.clientId;
      }
    });
  }

  async submit(returnUri?: string, includeUserIdentifier?: boolean) {
    this.initiateSsoFormPromise = this.preValidate();
    if (await this.initiateSsoFormPromise) {
      const authorizeUrl = await this.buildAuthorizeUrl(returnUri, includeUserIdentifier);
      this.platformUtilsService.launchUri(authorizeUrl, { sameWindow: true });
    }
  }

  async preValidate(): Promise<boolean> {
    if (this.identifier == null || this.identifier === "") {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("ssoValidationFailed"),
        this.i18nService.t("ssoIdentifierRequired")
      );
      return false;
    }
    return await this.apiService.preValidateSso(this.identifier);
  }

  protected async buildAuthorizeUrl(
    returnUri?: string,
    includeUserIdentifier?: boolean
  ): Promise<string> {
    let codeChallenge = this.codeChallenge;
    let state = this.state;

    const passwordOptions: any = {
      type: "password",
      length: 64,
      uppercase: true,
      lowercase: true,
      numbers: true,
      special: false,
    };

    if (codeChallenge == null) {
      const codeVerifier = await this.passwordGenerationService.generatePassword(passwordOptions);
      const codeVerifierHash = await this.cryptoFunctionService.hash(codeVerifier, "sha256");
      codeChallenge = Utils.fromBufferToUrlB64(codeVerifierHash);
      await this.stateService.setSsoCodeVerifier(codeVerifier);
    }

    if (state == null) {
      state = await this.passwordGenerationService.generatePassword(passwordOptions);
      if (returnUri) {
        state += `_returnUri='${returnUri}'`;
      }
    }

    // Add Organization Identifier to state
    state += `_identifier=${this.identifier}`;

    // Save state (regardless of new or existing)
    await this.stateService.setSsoState(state);

    let authorizeUrl =
      this.environmentService.getIdentityUrl() +
      "/connect/authorize?" +
      "client_id=" +
      this.clientId +
      "&redirect_uri=" +
      encodeURIComponent(this.redirectUri) +
      "&" +
      "response_type=code&scope=api offline_access&" +
      "state=" +
      state +
      "&code_challenge=" +
      codeChallenge +
      "&" +
      "code_challenge_method=S256&response_mode=query&" +
      "domain_hint=" +
      encodeURIComponent(this.identifier);

    if (includeUserIdentifier) {
      const userIdentifier = await this.apiService.getSsoUserIdentifier();
      authorizeUrl += `&user_identifier=${encodeURIComponent(userIdentifier)}`;
    }

    return authorizeUrl;
  }

  private async logIn(code: string, codeVerifier: string, orgIdFromState: string) {
    this.loggingIn = true;
    try {
      const credentials = new SsoLogInCredentials(
        code,
        codeVerifier,
        this.redirectUri,
        orgIdFromState
      );
      this.formPromise = this.authService.logIn(credentials);
      const response = await this.formPromise;
      if (response.requiresTwoFactor) {
        if (this.onSuccessfulLoginTwoFactorNavigate != null) {
          this.onSuccessfulLoginTwoFactorNavigate();
        } else {
          this.router.navigate([this.twoFactorRoute], {
            queryParams: {
              identifier: orgIdFromState,
              sso: "true",
            },
          });
        }
      } else if (response.resetMasterPassword) {
        if (this.onSuccessfulLoginChangePasswordNavigate != null) {
          this.onSuccessfulLoginChangePasswordNavigate();
        } else {
          this.router.navigate([this.changePasswordRoute], {
            queryParams: {
              identifier: orgIdFromState,
            },
          });
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
      if (e.message === "Unable to reach key connector") {
        this.platformUtilsService.showToast(
          "error",
          null,
          this.i18nService.t("ssoKeyConnectorUnavailable")
        );
      }
    }
    this.loggingIn = false;
  }

  private getOrgIdentifierFromState(state: string): string {
    if (state === null || state === undefined) {
      return null;
    }

    const stateSplit = state.split("_identifier=");
    return stateSplit.length > 1 ? stateSplit[1] : null;
  }

  private checkState(state: string, checkState: string): boolean {
    if (state === null || state === undefined) {
      return false;
    }
    if (checkState === null || checkState === undefined) {
      return false;
    }

    const stateSplit = state.split("_identifier=");
    const checkStateSplit = checkState.split("_identifier=");
    return stateSplit[0] === checkStateSplit[0];
  }
}
