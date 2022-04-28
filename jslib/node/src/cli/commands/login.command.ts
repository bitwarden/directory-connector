import * as http from "http";

import * as program from "commander";
import * as inquirer from "inquirer";
import Separator from "inquirer/lib/objects/separator";

import { ApiService } from "jslib-common/abstractions/api.service";
import { AuthService } from "jslib-common/abstractions/auth.service";
import { CryptoService } from "jslib-common/abstractions/crypto.service";
import { CryptoFunctionService } from "jslib-common/abstractions/cryptoFunction.service";
import { EnvironmentService } from "jslib-common/abstractions/environment.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { PasswordGenerationService } from "jslib-common/abstractions/passwordGeneration.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { PolicyService } from "jslib-common/abstractions/policy.service";
import { StateService } from "jslib-common/abstractions/state.service";
import { TwoFactorService } from "jslib-common/abstractions/twoFactor.service";
import { TwoFactorProviderType } from "jslib-common/enums/twoFactorProviderType";
import { NodeUtils } from "jslib-common/misc/nodeUtils";
import { Utils } from "jslib-common/misc/utils";
import { AuthResult } from "jslib-common/models/domain/authResult";
import {
  ApiLogInCredentials,
  PasswordLogInCredentials,
  SsoLogInCredentials,
} from "jslib-common/models/domain/logInCredentials";
import { TokenRequestTwoFactor } from "jslib-common/models/request/identityToken/tokenRequestTwoFactor";
import { TwoFactorEmailRequest } from "jslib-common/models/request/twoFactorEmailRequest";
import { UpdateTempPasswordRequest } from "jslib-common/models/request/updateTempPasswordRequest";
import { ErrorResponse } from "jslib-common/models/response/errorResponse";

import { Response } from "../models/response";
import { MessageResponse } from "../models/response/messageResponse";

export class LoginCommand {
  protected validatedParams: () => Promise<any>;
  protected success: () => Promise<MessageResponse>;
  protected logout: () => Promise<void>;
  protected canInteract: boolean;
  protected clientId: string;
  protected clientSecret: string;
  protected email: string;

  private ssoRedirectUri: string = null;

  constructor(
    protected authService: AuthService,
    protected apiService: ApiService,
    protected i18nService: I18nService,
    protected environmentService: EnvironmentService,
    protected passwordGenerationService: PasswordGenerationService,
    protected cryptoFunctionService: CryptoFunctionService,
    protected platformUtilsService: PlatformUtilsService,
    protected stateService: StateService,
    protected cryptoService: CryptoService,
    protected policyService: PolicyService,
    protected twoFactorService: TwoFactorService,
    clientId: string
  ) {
    this.clientId = clientId;
  }

  async run(email: string, password: string, options: program.OptionValues) {
    this.canInteract = process.env.BW_NOINTERACTION !== "true";

    let ssoCodeVerifier: string = null;
    let ssoCode: string = null;
    let orgIdentifier: string = null;

    let clientId: string = null;
    let clientSecret: string = null;

    let selectedProvider: any = null;

    if (options.apikey != null) {
      const apiIdentifiers = await this.apiIdentifiers();
      clientId = apiIdentifiers.clientId;
      clientSecret = apiIdentifiers.clientSecret;
    } else if (options.sso != null && this.canInteract) {
      const passwordOptions: any = {
        type: "password",
        length: 64,
        uppercase: true,
        lowercase: true,
        numbers: true,
        special: false,
      };
      const state = await this.passwordGenerationService.generatePassword(passwordOptions);
      ssoCodeVerifier = await this.passwordGenerationService.generatePassword(passwordOptions);
      const codeVerifierHash = await this.cryptoFunctionService.hash(ssoCodeVerifier, "sha256");
      const codeChallenge = Utils.fromBufferToUrlB64(codeVerifierHash);
      try {
        const ssoParams = await this.openSsoPrompt(codeChallenge, state);
        ssoCode = ssoParams.ssoCode;
        orgIdentifier = ssoParams.orgIdentifier;
      } catch {
        return Response.badRequest("Something went wrong. Try again.");
      }
    } else {
      if ((email == null || email === "") && this.canInteract) {
        const answer: inquirer.Answers = await inquirer.createPromptModule({
          output: process.stderr,
        })({
          type: "input",
          name: "email",
          message: "Email address:",
        });
        email = answer.email;
      }
      if (email == null || email.trim() === "") {
        return Response.badRequest("Email address is required.");
      }
      if (email.indexOf("@") === -1) {
        return Response.badRequest("Email address is invalid.");
      }
      this.email = email;

      if (password == null || password === "") {
        if (options.passwordfile) {
          password = await NodeUtils.readFirstLine(options.passwordfile);
        } else if (options.passwordenv && process.env[options.passwordenv]) {
          password = process.env[options.passwordenv];
        } else if (this.canInteract) {
          const answer: inquirer.Answers = await inquirer.createPromptModule({
            output: process.stderr,
          })({
            type: "password",
            name: "password",
            message: "Master password:",
          });
          password = answer.password;
        }
      }

      if (password == null || password === "") {
        return Response.badRequest("Master password is required.");
      }
    }

    let twoFactorToken: string = options.code;
    let twoFactorMethod: TwoFactorProviderType = null;
    try {
      if (options.method != null) {
        twoFactorMethod = parseInt(options.method, null);
      }
    } catch (e) {
      return Response.error("Invalid two-step login method.");
    }

    const twoFactor =
      twoFactorToken == null
        ? null
        : new TokenRequestTwoFactor(twoFactorMethod, twoFactorToken, false);

    try {
      if (this.validatedParams != null) {
        await this.validatedParams();
      }

      let response: AuthResult = null;
      if (clientId != null && clientSecret != null) {
        response = await this.authService.logIn(new ApiLogInCredentials(clientId, clientSecret));
      } else if (ssoCode != null && ssoCodeVerifier != null) {
        response = await this.authService.logIn(
          new SsoLogInCredentials(
            ssoCode,
            ssoCodeVerifier,
            this.ssoRedirectUri,
            orgIdentifier,
            twoFactor
          )
        );
      } else {
        response = await this.authService.logIn(
          new PasswordLogInCredentials(email, password, null, twoFactor)
        );
      }
      if (response.captchaSiteKey) {
        const credentials = new PasswordLogInCredentials(email, password);
        const handledResponse = await this.handleCaptchaRequired(twoFactor, credentials);

        // Error Response
        if (handledResponse instanceof Response) {
          return handledResponse;
        } else {
          response = handledResponse;
        }
      }
      if (response.requiresTwoFactor) {
        const twoFactorProviders = this.twoFactorService.getSupportedProviders(null);
        if (twoFactorProviders.length === 0) {
          return Response.badRequest("No providers available for this client.");
        }

        if (twoFactorMethod != null) {
          try {
            selectedProvider = twoFactorProviders.filter((p) => p.type === twoFactorMethod)[0];
          } catch (e) {
            return Response.error("Invalid two-step login method.");
          }
        }

        if (selectedProvider == null) {
          if (twoFactorProviders.length === 1) {
            selectedProvider = twoFactorProviders[0];
          } else if (this.canInteract) {
            const twoFactorOptions: (string | Separator)[] = twoFactorProviders.map((p) => p.name);
            twoFactorOptions.push(new inquirer.Separator());
            twoFactorOptions.push("Cancel");
            const answer: inquirer.Answers = await inquirer.createPromptModule({
              output: process.stderr,
            })({
              type: "list",
              name: "method",
              message: "Two-step login method:",
              choices: twoFactorOptions,
            });
            const i = twoFactorOptions.indexOf(answer.method);
            if (i === twoFactorOptions.length - 1) {
              return Response.error("Login failed.");
            }
            selectedProvider = twoFactorProviders[i];
          }
          if (selectedProvider == null) {
            return Response.error("Login failed. No provider selected.");
          }
        }

        if (
          twoFactorToken == null &&
          response.twoFactorProviders.size > 1 &&
          selectedProvider.type === TwoFactorProviderType.Email
        ) {
          const emailReq = new TwoFactorEmailRequest();
          emailReq.email = this.authService.email;
          emailReq.masterPasswordHash = this.authService.masterPasswordHash;
          await this.apiService.postTwoFactorEmail(emailReq);
        }

        if (twoFactorToken == null) {
          if (this.canInteract) {
            const answer: inquirer.Answers = await inquirer.createPromptModule({
              output: process.stderr,
            })({
              type: "input",
              name: "token",
              message: "Two-step login code:",
            });
            twoFactorToken = answer.token;
          }
          if (twoFactorToken == null || twoFactorToken === "") {
            return Response.badRequest("Code is required.");
          }
        }

        response = await this.authService.logInTwoFactor(
          new TokenRequestTwoFactor(selectedProvider.type, twoFactorToken),
          null
        );
      }

      if (response.captchaSiteKey) {
        const twoFactorRequest = new TokenRequestTwoFactor(selectedProvider.type, twoFactorToken);
        const handledResponse = await this.handleCaptchaRequired(twoFactorRequest);

        // Error Response
        if (handledResponse instanceof Response) {
          return handledResponse;
        } else {
          response = handledResponse;
        }
      }

      if (response.requiresTwoFactor) {
        return Response.error("Login failed.");
      }

      if (response.resetMasterPassword) {
        return Response.error(
          "In order to log in with SSO from the CLI, you must first log in" +
            " through the web vault to set your master password."
        );
      }

      // Handle Updating Temp Password if NOT using an API Key for authentication
      if (response.forcePasswordReset && clientId == null && clientSecret == null) {
        return await this.updateTempPassword();
      }

      return await this.handleSuccessResponse();
    } catch (e) {
      return Response.error(e);
    }
  }

  private async handleSuccessResponse(): Promise<Response> {
    if (this.success != null) {
      const res = await this.success();
      return Response.success(res);
    } else {
      const res = new MessageResponse("You are logged in!", null);
      return Response.success(res);
    }
  }

  private async updateTempPassword(error?: string): Promise<Response> {
    // If no interaction available, alert user to use web vault
    if (!this.canInteract) {
      await this.logout();
      this.authService.logOut(() => {
        /* Do nothing */
      });
      return Response.error(
        new MessageResponse(
          "An organization administrator recently changed your master password. In order to access the vault, you must update your master password now via the web vault. You have been logged out.",
          null
        )
      );
    }

    if (this.email == null || this.email === "undefined") {
      this.email = await this.stateService.getEmail();
    }

    // Get New Master Password
    const baseMessage =
      "An organization administrator recently changed your master password. In order to access the vault, you must update your master password now.\n" +
      "Master password: ";
    const firstMessage = error != null ? error + baseMessage : baseMessage;
    const mp: inquirer.Answers = await inquirer.createPromptModule({ output: process.stderr })({
      type: "password",
      name: "password",
      message: firstMessage,
    });
    const masterPassword = mp.password;

    // Master Password Validation
    if (masterPassword == null || masterPassword === "") {
      return this.updateTempPassword("Master password is required.\n");
    }

    if (masterPassword.length < 8) {
      return this.updateTempPassword("Master password must be at least 8 characters long.\n");
    }

    // Strength & Policy Validation
    const strengthResult = this.passwordGenerationService.passwordStrength(
      masterPassword,
      this.getPasswordStrengthUserInput()
    );

    // Get New Master Password Re-type
    const reTypeMessage = "Re-type New Master password (Strength: " + strengthResult.score + ")";
    const retype: inquirer.Answers = await inquirer.createPromptModule({ output: process.stderr })({
      type: "password",
      name: "password",
      message: reTypeMessage,
    });
    const masterPasswordRetype = retype.password;

    // Re-type Validation
    if (masterPassword !== masterPasswordRetype) {
      return this.updateTempPassword("Master password confirmation does not match.\n");
    }

    // Get Hint (optional)
    const hint: inquirer.Answers = await inquirer.createPromptModule({ output: process.stderr })({
      type: "input",
      name: "input",
      message: "Master Password Hint (optional):",
    });
    const masterPasswordHint = hint.input;

    // Retrieve details for key generation
    const enforcedPolicyOptions = await this.policyService.getMasterPasswordPolicyOptions();
    const kdf = await this.stateService.getKdfType();
    const kdfIterations = await this.stateService.getKdfIterations();

    if (
      enforcedPolicyOptions != null &&
      !this.policyService.evaluateMasterPassword(
        strengthResult.score,
        masterPassword,
        enforcedPolicyOptions
      )
    ) {
      return this.updateTempPassword(
        "Your new master password does not meet the policy requirements.\n"
      );
    }

    try {
      // Create new key and hash new password
      const newKey = await this.cryptoService.makeKey(
        masterPassword,
        this.email.trim().toLowerCase(),
        kdf,
        kdfIterations
      );
      const newPasswordHash = await this.cryptoService.hashPassword(masterPassword, newKey);

      // Grab user's current enc key
      const userEncKey = await this.cryptoService.getEncKey();

      // Create new encKey for the User
      const newEncKey = await this.cryptoService.remakeEncKey(newKey, userEncKey);

      // Create request
      const request = new UpdateTempPasswordRequest();
      request.key = newEncKey[1].encryptedString;
      request.newMasterPasswordHash = newPasswordHash;
      request.masterPasswordHint = masterPasswordHint;

      // Update user's password
      await this.apiService.putUpdateTempPassword(request);
      return this.handleSuccessResponse();
    } catch (e) {
      await this.logout();
      this.authService.logOut(() => {
        /* Do nothing */
      });
      return Response.error(e);
    }
  }

  private async handleCaptchaRequired(
    twoFactorRequest: TokenRequestTwoFactor,
    credentials: PasswordLogInCredentials = null
  ): Promise<AuthResult | Response> {
    const badCaptcha = Response.badRequest(
      "Your authentication request has been flagged and will require user interaction to proceed.\n" +
        "Please use your API key to validate this request and ensure BW_CLIENTSECRET is correct, if set.\n" +
        "(https://bitwarden.com/help/cli-auth-challenges)"
    );

    try {
      const captchaClientSecret = await this.apiClientSecret(true);
      if (Utils.isNullOrWhitespace(captchaClientSecret)) {
        return badCaptcha;
      }

      let authResultResponse: AuthResult = null;
      if (credentials != null) {
        credentials.captchaToken = captchaClientSecret;
        credentials.twoFactor = twoFactorRequest;
        authResultResponse = await this.authService.logIn(credentials);
      } else {
        authResultResponse = await this.authService.logInTwoFactor(
          twoFactorRequest,
          captchaClientSecret
        );
      }

      return authResultResponse;
    } catch (e) {
      if (
        e instanceof ErrorResponse ||
        (e.constructor.name === ErrorResponse.name &&
          (e as ErrorResponse).message.includes("Captcha is invalid"))
      ) {
        return badCaptcha;
      } else {
        return Response.error(e);
      }
    }
  }

  private getPasswordStrengthUserInput() {
    let userInput: string[] = [];
    const atPosition = this.email.indexOf("@");
    if (atPosition > -1) {
      userInput = userInput.concat(
        this.email
          .substr(0, atPosition)
          .trim()
          .toLowerCase()
          .split(/[^A-Za-z0-9]/)
      );
    }
    return userInput;
  }

  private async apiClientId(): Promise<string> {
    let clientId: string = null;

    const storedClientId: string = process.env.BW_CLIENTID;
    if (storedClientId == null) {
      if (this.canInteract) {
        const answer: inquirer.Answers = await inquirer.createPromptModule({
          output: process.stderr,
        })({
          type: "input",
          name: "clientId",
          message: "client_id:",
        });
        clientId = answer.clientId;
      } else {
        clientId = null;
      }
    } else {
      clientId = storedClientId;
    }

    return clientId;
  }

  private async apiClientSecret(isAdditionalAuthentication = false): Promise<string> {
    const additionalAuthenticationMessage = "Additional authentication required.\nAPI key ";
    let clientSecret: string = null;

    const storedClientSecret: string = this.clientSecret || process.env.BW_CLIENTSECRET;
    if (this.canInteract && storedClientSecret == null) {
      const answer: inquirer.Answers = await inquirer.createPromptModule({
        output: process.stderr,
      })({
        type: "input",
        name: "clientSecret",
        message:
          (isAdditionalAuthentication ? additionalAuthenticationMessage : "") + "client_secret:",
      });
      clientSecret = answer.clientSecret;
    } else {
      clientSecret = storedClientSecret;
    }

    return clientSecret;
  }

  private async apiIdentifiers(): Promise<{ clientId: string; clientSecret: string }> {
    return {
      clientId: await this.apiClientId(),
      clientSecret: await this.apiClientSecret(),
    };
  }

  private async openSsoPrompt(
    codeChallenge: string,
    state: string
  ): Promise<{ ssoCode: string; orgIdentifier: string }> {
    return new Promise((resolve, reject) => {
      const callbackServer = http.createServer((req, res) => {
        const urlString = "http://localhost" + req.url;
        const url = new URL(urlString);
        const code = url.searchParams.get("code");
        const receivedState = url.searchParams.get("state");
        const orgIdentifier = this.getOrgIdentifierFromState(receivedState);
        res.setHeader("Content-Type", "text/html");
        if (code != null && receivedState != null && this.checkState(receivedState, state)) {
          res.writeHead(200);
          res.end(
            "<html><head><title>Success | Bitwarden CLI</title></head><body>" +
              "<h1>Successfully authenticated with the Bitwarden CLI</h1>" +
              "<p>You may now close this tab and return to the terminal.</p>" +
              "</body></html>"
          );
          callbackServer.close(() =>
            resolve({
              ssoCode: code,
              orgIdentifier: orgIdentifier,
            })
          );
        } else {
          res.writeHead(400);
          res.end(
            "<html><head><title>Failed | Bitwarden CLI</title></head><body>" +
              "<h1>Something went wrong logging into the Bitwarden CLI</h1>" +
              "<p>You may now close this tab and return to the terminal.</p>" +
              "</body></html>"
          );
          callbackServer.close(() => reject());
        }
      });
      let foundPort = false;
      const webUrl = this.environmentService.getWebVaultUrl();
      for (let port = 8065; port <= 8070; port++) {
        try {
          this.ssoRedirectUri = "http://localhost:" + port;
          callbackServer.listen(port, () => {
            this.platformUtilsService.launchUri(
              webUrl +
                "/#/sso?clientId=" +
                this.clientId +
                "&redirectUri=" +
                encodeURIComponent(this.ssoRedirectUri) +
                "&state=" +
                state +
                "&codeChallenge=" +
                codeChallenge
            );
          });
          foundPort = true;
          break;
        } catch {
          // Ignore error since we run the same command up to 5 times.
        }
      }
      if (!foundPort) {
        reject();
      }
    });
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
