import { Response } from "@/jslib/node/src/cli/models/response";
import { MessageResponse } from "@/jslib/node/src/cli/models/response/messageResponse";

import { AuthService } from "../abstractions/auth.service";

export class LogoutCommand {
  constructor(
    private authService: AuthService,
    private logoutCallback: () => Promise<void>,
  ) {}

  async run() {
    await this.logoutCallback();
    this.authService.logOut(() => {
      /* Do nothing */
    });
    const res = new MessageResponse("You have logged out.", null);
    return Response.success(res);
  }
}
