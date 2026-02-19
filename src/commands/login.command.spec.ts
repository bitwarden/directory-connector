import { mock, MockProxy } from "jest-mock-extended";

import { AuthService } from "../abstractions/auth.service";
import { StateService } from "../abstractions/state.service";

import { LoginCommand } from "./login.command";

const clientId = "test_client_id";
const clientSecret = "test_client_secret";
const orgId = "00000000-0000-0000-0000-000000000000";
const orgClientId = `organization.${orgId}`;

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
  let stateService: MockProxy<StateService>;

  let loginCommand: LoginCommand;

  beforeEach(() => {
    // reset env variables
    delete process.env.BW_CLIENTID;
    delete process.env.BW_CLIENTSECRET;

    authService = mock();
    stateService = mock();

    loginCommand = new LoginCommand(authService, stateService);
  });

  it("uses client id and secret stored in environment variables", async () => {
    process.env.BW_CLIENTID = clientId;
    process.env.BW_CLIENTSECRET = clientSecret;

    const result = await loginCommand.run();

    expect(authService.logIn).toHaveBeenCalledWith({ clientId, clientSecret });
    expect(stateService.setOrganizationId).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      data: {
        title: "You are logged in!",
      },
      success: true,
    });
  });


  it("sets organization id when client id is organization-scoped", async () => {
    process.env.BW_CLIENTID = orgClientId;
    process.env.BW_CLIENTSECRET = clientSecret;

    const result = await loginCommand.run();

    expect(authService.logIn).toHaveBeenCalledWith({ clientId: orgClientId, clientSecret });
    expect(stateService.setOrganizationId).toHaveBeenCalledWith(orgId);
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
    expect(stateService.setOrganizationId).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      data: {
        title: "You are logged in!",
      },
      success: true,
    });
  });
});
