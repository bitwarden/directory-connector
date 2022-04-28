import { StateVersion } from "../../enums/stateVersion";
import { ThemeType } from "../../enums/themeType";

import { EnvironmentUrls } from "./environmentUrls";
import { WindowState } from "./windowState";

export class GlobalState {
  enableAlwaysOnTop?: boolean;
  installedVersion?: string;
  locale?: string = "en";
  organizationInvitation?: any;
  ssoCodeVerifier?: string;
  ssoOrganizationIdentifier?: string;
  ssoState?: string;
  rememberedEmail?: string;
  theme?: ThemeType = ThemeType.System;
  window?: WindowState = new WindowState();
  twoFactorToken?: string;
  disableFavicon?: boolean;
  biometricAwaitingAcceptance?: boolean;
  biometricFingerprintValidated?: boolean;
  vaultTimeout?: number;
  vaultTimeoutAction?: string;
  loginRedirect?: any;
  mainWindowSize?: number;
  enableBiometrics?: boolean;
  biometricText?: string;
  noAutoPromptBiometrics?: boolean;
  noAutoPromptBiometricsText?: string;
  stateVersion: StateVersion = StateVersion.One;
  environmentUrls: EnvironmentUrls = new EnvironmentUrls();
  enableTray?: boolean;
  enableMinimizeToTray?: boolean;
  enableCloseToTray?: boolean;
  enableStartToTray?: boolean;
  openAtLogin?: boolean;
  alwaysShowDock?: boolean;
  enableBrowserIntegration?: boolean;
  enableBrowserIntegrationFingerprint?: boolean;
}
