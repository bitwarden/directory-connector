import * as program from "commander";
import * as inquirer from "inquirer";

import { AuthService } from "@/jslib/common/src/abstractions/auth.service";
import { ApiLogInCredentials } from "@/jslib/common/src/models/domain/logInCredentials";
import { Response } from "@/jslib/node/src/cli/models/response";
import { MessageResponse } from "@/jslib/node/src/cli/models/response/messageResponse";

export class LoginCommand {
  private canInteract: boolean;
  private clientSecret: string;

  constructor(private authService: AuthService) {}

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
    const res = new MessageResponse("You are logged in!", null);
    return Response.success(res);
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
