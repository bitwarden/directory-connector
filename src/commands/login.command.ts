import * as program from "commander";
import * as inquirer from "inquirer";

import { ApiService } from "@/jslib/common/src/abstractions/api.service";
import { AuthService } from "@/jslib/common/src/abstractions/auth.service";
import { CryptoService } from "@/jslib/common/src/abstractions/crypto.service";
import { CryptoFunctionService } from "@/jslib/common/src/abstractions/cryptoFunction.service";
import { EnvironmentService } from "@/jslib/common/src/abstractions/environment.service";
import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { PasswordGenerationService } from "@/jslib/common/src/abstractions/passwordGeneration.service";
import { PlatformUtilsService } from "@/jslib/common/src/abstractions/platformUtils.service";
import { PolicyService } from "@/jslib/common/src/abstractions/policy.service";
import { StateService } from "@/jslib/common/src/abstractions/state.service";
import { TwoFactorService } from "@/jslib/common/src/abstractions/twoFactor.service";
import { ApiLogInCredentials } from "@/jslib/common/src/models/domain/logInCredentials";
import { Response } from "@/jslib/node/src/cli/models/response";
import { MessageResponse } from "@/jslib/node/src/cli/models/response/messageResponse";

export class LoginCommand {
  protected validatedParams: () => Promise<any>;
  protected success: () => Promise<MessageResponse>;
  protected logout: () => Promise<void>;
  protected canInteract: boolean;
  protected clientId: string;
  protected clientSecret: string;
  protected email: string;

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
    clientId: string,
  ) {
    this.clientId = clientId;
  }

  async run(email: string, password: string, options: program.OptionValues) {
    this.canInteract = process.env.BW_NOINTERACTION !== "true";

    let clientId: string = null;
    let clientSecret: string = null;

    if (options.apikey != null) {
      const apiIdentifiers = await this.apiIdentifiers();
      clientId = apiIdentifiers.clientId;
      clientSecret = apiIdentifiers.clientSecret;
    }

    try {
      if (clientId != null && clientSecret != null) {
        await this.authService.logIn(new ApiLogInCredentials(clientId, clientSecret));
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
}
