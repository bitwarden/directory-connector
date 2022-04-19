import { Directive, NgZone, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { take } from "rxjs/operators";

import { ApiService } from "jslib-common/abstractions/api.service";
import { CryptoService } from "jslib-common/abstractions/crypto.service";
import { EnvironmentService } from "jslib-common/abstractions/environment.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { KeyConnectorService } from "jslib-common/abstractions/keyConnector.service";
import { LogService } from "jslib-common/abstractions/log.service";
import { MessagingService } from "jslib-common/abstractions/messaging.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { StateService } from "jslib-common/abstractions/state.service";
import { VaultTimeoutService } from "jslib-common/abstractions/vaultTimeout.service";
import { HashPurpose } from "jslib-common/enums/hashPurpose";
import { KeySuffixOptions } from "jslib-common/enums/keySuffixOptions";
import { Utils } from "jslib-common/misc/utils";
import { EncString } from "jslib-common/models/domain/encString";
import { SymmetricCryptoKey } from "jslib-common/models/domain/symmetricCryptoKey";
import { SecretVerificationRequest } from "jslib-common/models/request/secretVerificationRequest";

@Directive()
export class LockComponent implements OnInit {
  masterPassword = "";
  pin = "";
  showPassword = false;
  email: string;
  pinLock = false;
  webVaultHostname = "";
  formPromise: Promise<any>;
  supportsBiometric: boolean;
  biometricLock: boolean;
  biometricText: string;
  hideInput: boolean;

  protected successRoute = "vault";
  protected onSuccessfulSubmit: () => Promise<void>;

  private invalidPinAttempts = 0;
  private pinSet: [boolean, boolean];

  constructor(
    protected router: Router,
    protected i18nService: I18nService,
    protected platformUtilsService: PlatformUtilsService,
    protected messagingService: MessagingService,
    protected cryptoService: CryptoService,
    protected vaultTimeoutService: VaultTimeoutService,
    protected environmentService: EnvironmentService,
    protected stateService: StateService,
    protected apiService: ApiService,
    protected logService: LogService,
    private keyConnectorService: KeyConnectorService,
    protected ngZone: NgZone
  ) {}

  async ngOnInit() {
    // Load the first and observe updates
    await this.load();
    this.stateService.activeAccount.subscribe(async () => {
      await this.load();
    });
  }

  async submit() {
    if (this.pinLock && (this.pin == null || this.pin === "")) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("pinRequired")
      );
      return;
    }
    if (!this.pinLock && (this.masterPassword == null || this.masterPassword === "")) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("masterPassRequired")
      );
      return;
    }

    const kdf = await this.stateService.getKdfType();
    const kdfIterations = await this.stateService.getKdfIterations();

    if (this.pinLock) {
      let failed = true;
      try {
        if (this.pinSet[0]) {
          const key = await this.cryptoService.makeKeyFromPin(
            this.pin,
            this.email,
            kdf,
            kdfIterations,
            await this.stateService.getDecryptedPinProtected()
          );
          const encKey = await this.cryptoService.getEncKey(key);
          const protectedPin = await this.stateService.getProtectedPin();
          const decPin = await this.cryptoService.decryptToUtf8(
            new EncString(protectedPin),
            encKey
          );
          failed = decPin !== this.pin;
          if (!failed) {
            await this.setKeyAndContinue(key);
          }
        } else {
          const key = await this.cryptoService.makeKeyFromPin(
            this.pin,
            this.email,
            kdf,
            kdfIterations
          );
          failed = false;
          await this.setKeyAndContinue(key);
        }
      } catch {
        failed = true;
      }

      if (failed) {
        this.invalidPinAttempts++;
        if (this.invalidPinAttempts >= 5) {
          this.messagingService.send("logout");
          return;
        }
        this.platformUtilsService.showToast(
          "error",
          this.i18nService.t("errorOccurred"),
          this.i18nService.t("invalidPin")
        );
      }
    } else {
      const key = await this.cryptoService.makeKey(
        this.masterPassword,
        this.email,
        kdf,
        kdfIterations
      );
      const storedKeyHash = await this.cryptoService.getKeyHash();

      let passwordValid = false;

      if (storedKeyHash != null) {
        passwordValid = await this.cryptoService.compareAndUpdateKeyHash(this.masterPassword, key);
      } else {
        const request = new SecretVerificationRequest();
        const serverKeyHash = await this.cryptoService.hashPassword(
          this.masterPassword,
          key,
          HashPurpose.ServerAuthorization
        );
        request.masterPasswordHash = serverKeyHash;
        try {
          this.formPromise = this.apiService.postAccountVerifyPassword(request);
          await this.formPromise;
          passwordValid = true;
          const localKeyHash = await this.cryptoService.hashPassword(
            this.masterPassword,
            key,
            HashPurpose.LocalAuthorization
          );
          await this.cryptoService.setKeyHash(localKeyHash);
        } catch (e) {
          this.logService.error(e);
        }
      }

      if (passwordValid) {
        if (this.pinSet[0]) {
          const protectedPin = await this.stateService.getProtectedPin();
          const encKey = await this.cryptoService.getEncKey(key);
          const decPin = await this.cryptoService.decryptToUtf8(
            new EncString(protectedPin),
            encKey
          );
          const pinKey = await this.cryptoService.makePinKey(
            decPin,
            this.email,
            kdf,
            kdfIterations
          );
          await this.stateService.setDecryptedPinProtected(
            await this.cryptoService.encrypt(key.key, pinKey)
          );
        }
        await this.setKeyAndContinue(key);
      } else {
        this.platformUtilsService.showToast(
          "error",
          this.i18nService.t("errorOccurred"),
          this.i18nService.t("invalidMasterPassword")
        );
      }
    }
  }

  async logOut() {
    const confirmed = await this.platformUtilsService.showDialog(
      this.i18nService.t("logOutConfirmation"),
      this.i18nService.t("logOut"),
      this.i18nService.t("logOut"),
      this.i18nService.t("cancel")
    );
    if (confirmed) {
      this.messagingService.send("logout");
    }
  }

  async unlockBiometric(): Promise<boolean> {
    if (!this.biometricLock) {
      return;
    }

    const success = (await this.cryptoService.getKey(KeySuffixOptions.Biometric)) != null;

    if (success) {
      await this.doContinue();
    }

    return success;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
    const input = document.getElementById(this.pinLock ? "pin" : "masterPassword");
    if (this.ngZone.isStable) {
      input.focus();
    } else {
      this.ngZone.onStable.pipe(take(1)).subscribe(() => input.focus());
    }
  }

  private async setKeyAndContinue(key: SymmetricCryptoKey) {
    await this.cryptoService.setKey(key);
    await this.doContinue();
  }

  private async doContinue() {
    await this.stateService.setBiometricLocked(false);
    await this.stateService.setEverBeenUnlocked(true);
    const disableFavicon = await this.stateService.getDisableFavicon();
    await this.stateService.setDisableFavicon(!!disableFavicon);
    this.messagingService.send("unlocked");
    if (this.onSuccessfulSubmit != null) {
      await this.onSuccessfulSubmit();
    } else if (this.router != null) {
      this.router.navigate([this.successRoute]);
    }
  }

  private async load() {
    this.pinSet = await this.vaultTimeoutService.isPinLockSet();
    this.pinLock =
      (this.pinSet[0] && (await this.stateService.getDecryptedPinProtected()) != null) ||
      this.pinSet[1];
    this.supportsBiometric = await this.platformUtilsService.supportsBiometric();
    this.biometricLock =
      (await this.vaultTimeoutService.isBiometricLockSet()) &&
      ((await this.cryptoService.hasKeyStored(KeySuffixOptions.Biometric)) ||
        !this.platformUtilsService.supportsSecureStorage());
    this.biometricText = await this.stateService.getBiometricText();
    this.email = await this.stateService.getEmail();
    const usesKeyConnector = await this.keyConnectorService.getUsesKeyConnector();
    this.hideInput = usesKeyConnector && !this.pinLock;

    // Users with key connector and without biometric or pin has no MP to unlock using
    if (usesKeyConnector && !(this.biometricLock || this.pinLock)) {
      await this.vaultTimeoutService.logOut();
    }

    const webVaultUrl = this.environmentService.getWebVaultUrl();
    const vaultUrl =
      webVaultUrl === "https://vault.bitwarden.com" ? "https://bitwarden.com" : webVaultUrl;
    this.webVaultHostname = Utils.getHostname(vaultUrl);
  }
}
