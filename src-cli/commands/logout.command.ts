import { AuthService } from "@/libs/abstractions/auth.service";

import { Response } from "@/src-cli/cli/models/response";
import { MessageResponse } from "@/src-cli/cli/models/response/messageResponse";

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
