import { mock, MockProxy } from "jest-mock-extended";

import { AuthResult } from "@/jslib/common/src/models/domain/authResult";
import { ApiLogInCredentials } from "@/jslib/common/src/models/domain/logInCredentials";

import { AuthService } from "../abstractions/auth.service";

import { LoginCommand } from "./login.command";

const clientId = "test_client_id";
const clientSecret = "test_client_secret";

// Mock responses from the inquirer prompt
// This combines both prompt results into a single object which is returned both times
jest.mock("inquirer", () => ({
  createPromptModule: () => () => ({
    clientId,
    clientSecret,
  }),
}));

describe("LoginCommand", () => {
  let authService: MockProxy<AuthService>;

  let loginCommand: LoginCommand;

  beforeEach(() => {
    // reset env variables
    delete process.env.BW_CLIENTID;
    delete process.env.BW_CLIENTSECRET;

    authService = mock();

    loginCommand = new LoginCommand(authService);
  });

  it("uses client id and secret stored in environment variables", async () => {
    process.env.BW_CLIENTID = clientId;
    process.env.BW_CLIENTSECRET = clientSecret;

    authService.logIn.mockResolvedValue(new AuthResult()); // logging in with api key does not set any flag on the authResult

    const result = await loginCommand.run();

    expect(authService.logIn).toHaveBeenCalledWith(new ApiLogInCredentials(clientId, clientSecret));
    expect(result).toMatchObject({
      data: {
        title: "You are logged in!",
      },
      success: true,
    });
  });

  it("uses client id and secret prompted from the user", async () => {
    authService.logIn.mockResolvedValue(new AuthResult()); // logging in with api key does not set any flag on the authResult

    const result = await loginCommand.run();

    expect(authService.logIn).toHaveBeenCalledWith(new ApiLogInCredentials(clientId, clientSecret));
    expect(result).toMatchObject({
      data: {
        title: "You are logged in!",
      },
      success: true,
    });
  });
});
