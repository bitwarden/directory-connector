import { mock, MockProxy } from "jest-mock-extended";

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

    const result = await loginCommand.run();

    expect(authService.logIn).toHaveBeenCalledWith({ clientId, clientSecret });
    expect(result).toMatchObject({
      data: {
        title: "You are logged in!",
      },
      success: true,
    });
  });

  it("uses client id and secret prompted from the user", async () => {
    const result = await loginCommand.run();

    expect(authService.logIn).toHaveBeenCalledWith({ clientId, clientSecret });
    expect(result).toMatchObject({
      data: {
        title: "You are logged in!",
      },
      success: true,
    });
  });
});
