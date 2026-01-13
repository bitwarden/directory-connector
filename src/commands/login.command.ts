import * as inquirer from "inquirer";

import { Response } from "@/jslib/node/src/cli/models/response";
import { MessageResponse } from "@/jslib/node/src/cli/models/response/messageResponse";

import { Utils } from "../../jslib/common/src/misc/utils";
import { AuthService } from "../abstractions/auth.service";
import { StateService } from "../abstractions/state.service";

function parseOrgIdFromClientId(clientId: string): string {
  if (clientId == null) {
    return null;
  }

  const prefix = "organization.";
  if (!clientId.startsWith(prefix)) {
    return null;
  }

  const orgId = clientId.substring(prefix.length).trim();
  return orgId.length > 0 ? orgId : null;
}

export class LoginCommand {
  private canInteract: boolean;

  constructor(private authService: AuthService, private stateService: StateService) {}

  async run() {
    this.canInteract = process.env.BW_NOINTERACTION !== "true";

    const { clientId, clientSecret } = await this.apiIdentifiers();

    if (Utils.isNullOrWhitespace(clientId)) {
      return Response.error("Client ID is required.");
    }

    if (Utils.isNullOrWhitespace(clientSecret)) {
      return Response.error("Client Secret is required.");
    }

    let alreadyLoggedInMessage: string = null;

    try {
      await this.authService.logIn({ clientId, clientSecret });
    } catch (e: any) {
      // Treat "already logged in" as a non-fatal condition so we can still reconcile state.
      const msg = String(e?.message ?? e ?? "");
      if (msg.toLowerCase().includes("already logged in")) {
        alreadyLoggedInMessage = msg;
      } else {
        return Response.error(e);
      }
    }

    const orgId = parseOrgIdFromClientId(clientId);
    if (orgId != null) {
      try {
        await this.stateService.setOrganizationId(orgId);
      } catch (e) {
        return Response.error(e);
      }
    }

    const res = new MessageResponse(alreadyLoggedInMessage ?? "You are logged in!", null);
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
