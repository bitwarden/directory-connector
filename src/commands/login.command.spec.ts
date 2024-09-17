import { MockProxy } from "jest-mock-extended";

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

import { LoginCommand } from "./login.command";

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

  it("runs", () => {
    expect(loginCommand).not.toBeNull();
  });
});
