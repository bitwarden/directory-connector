import { mock, MockProxy } from "jest-mock-extended";

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

import { AuthResult } from "../../jslib/common/src/models/domain/authResult";
import { ApiLogInCredentials } from "../../jslib/common/src/models/domain/logInCredentials";

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
  let apiService: MockProxy<ApiService>;
  let i18nService: MockProxy<I18nService>;
  let environmentService: MockProxy<EnvironmentService>;
  let passwordGenerationService: MockProxy<PasswordGenerationService>;
  let cryptoFunctionService: MockProxy<CryptoFunctionService>;
  let platformUtilsService: MockProxy<PlatformUtilsService>;
  let stateService: MockProxy<StateService>;
  let cryptoService: MockProxy<CryptoService>;
  let policyService: MockProxy<PolicyService>;
  let twoFactorService: MockProxy<TwoFactorService>;

  let loginCommand: LoginCommand;

  beforeEach(() => {
    // reset env variables
    delete process.env.BW_CLIENTID;
    delete process.env.BW_CLIENTSECRET;

    authService = mock();
    apiService = mock();
    i18nService = mock();
    environmentService = mock();
    passwordGenerationService = mock();
    cryptoFunctionService = mock();
    platformUtilsService = mock();
    stateService = mock();
    cryptoService = mock();
    policyService = mock();
    twoFactorService = mock();

    loginCommand = new LoginCommand(
      authService,
      apiService,
      i18nService,
      environmentService,
      passwordGenerationService,
      cryptoFunctionService,
      platformUtilsService,
      stateService,
      cryptoService,
      policyService,
      twoFactorService,
      "connector",
    );
  });

  it("works with supplied api key", async () => {
    process.env.BW_CLIENTID = clientId;
    process.env.BW_CLIENTSECRET = clientSecret;

    authService.logIn.mockResolvedValue(new AuthResult()); // logging in with api key does not set any flag on the authResult

    const result = await loginCommand.run(null, null, { apikey: true });

    expect(authService.logIn).toHaveBeenCalledWith(new ApiLogInCredentials(clientId, clientSecret));
    expect(result).toMatchObject({
      data: {
        title: "You are logged in!",
      },
      success: true,
    });
  });

  it("works with prompted api key", async () => {
    // mock responses to the ClientId and ClientSecret input prompts

    authService.logIn.mockResolvedValue(new AuthResult()); // logging in with api key does not set any flag on the authResult

    const result = await loginCommand.run(null, null, { apikey: true });

    expect(authService.logIn).toHaveBeenCalledWith(new ApiLogInCredentials(clientId, clientSecret));
    expect(result).toMatchObject({
      data: {
        title: "You are logged in!",
      },
      success: true,
    });
  });
});
