import * as inquirer from "inquirer";

import { Response } from "@/jslib/node/src/cli/models/response";
import { MessageResponse } from "@/jslib/node/src/cli/models/response/messageResponse";

import { Utils } from "../../jslib/common/src/misc/utils";
import { AuthService } from "../abstractions/auth.service";

export class LoginCommand {
  private canInteract: boolean;

  constructor(private authService: AuthService) {}

  async run() {
    this.canInteract = process.env.BW_NOINTERACTION !== "true";

    const { clientId, clientSecret } = await this.apiIdentifiers();

    if (Utils.isNullOrWhitespace(clientId)) {
      return Response.error("Client ID is required.");
    }

    if (Utils.isNullOrWhitespace(clientSecret)) {
      return Response.error("Client Secret is required.");
    }

    try {
      await this.authService.logIn({ clientId, clientSecret });

      const res = new MessageResponse("You are logged in!", null);
      return Response.success(res);
    } catch (e) {
      return Response.error(e);
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

  private async apiClientSecret(): Promise<string> {
    let clientSecret: string = null;

    const storedClientSecret = process.env.BW_CLIENTSECRET;
    if (this.canInteract && storedClientSecret == null) {
      const answer: inquirer.Answers = await inquirer.createPromptModule({
        output: process.stderr,
      })({
        type: "input",
        name: "clientSecret",
        message: "client_secret:",
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
