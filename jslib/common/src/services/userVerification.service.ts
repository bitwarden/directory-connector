import { ApiService } from "../abstractions/api.service";
import { CryptoService } from "../abstractions/crypto.service";
import { I18nService } from "../abstractions/i18n.service";
import { UserVerificationService as UserVerificationServiceAbstraction } from "../abstractions/userVerification.service";
import { VerificationType } from "../enums/verificationType";
import { VerifyOTPRequest } from "../models/request/account/verifyOTPRequest";
import { SecretVerificationRequest } from "../models/request/secretVerificationRequest";
import { Verification } from "../types/verification";

/**
 * Used for general-purpose user verification throughout the app.
 * Use it to verify the input collected by UserVerificationComponent.
 */
export class UserVerificationService implements UserVerificationServiceAbstraction {
  constructor(
    private cryptoService: CryptoService,
    private i18nService: I18nService,
    private apiService: ApiService
  ) {}

  /**
   * Create a new request model to be used for server-side verification
   * @param verification User-supplied verification data (Master Password or OTP)
   * @param requestClass The request model to create
   * @param alreadyHashed Whether the master password is already hashed
   */
  async buildRequest<T extends SecretVerificationRequest>(
    verification: Verification,
    requestClass?: new () => T,
    alreadyHashed?: boolean
  ) {
    this.validateInput(verification);

    const request =
      requestClass != null ? new requestClass() : (new SecretVerificationRequest() as T);

    if (verification.type === VerificationType.OTP) {
      request.otp = verification.secret;
    } else {
      request.masterPasswordHash = alreadyHashed
        ? verification.secret
        : await this.cryptoService.hashPassword(verification.secret, null);
    }

    return request;
  }

  /**
   * Used to verify the Master Password client-side, or send the OTP to the server for verification (with no other data)
   * Generally used for client-side verification only.
   * @param verification User-supplied verification data (Master Password or OTP)
   */
  async verifyUser(verification: Verification): Promise<boolean> {
    this.validateInput(verification);

    if (verification.type === VerificationType.OTP) {
      const request = new VerifyOTPRequest(verification.secret);
      try {
        await this.apiService.postAccountVerifyOTP(request);
      } catch (e) {
        throw new Error(this.i18nService.t("invalidVerificationCode"));
      }
    } else {
      const passwordValid = await this.cryptoService.compareAndUpdateKeyHash(
        verification.secret,
        null
      );
      if (!passwordValid) {
        throw new Error(this.i18nService.t("invalidMasterPassword"));
      }
    }
    return true;
  }

  async requestOTP() {
    await this.apiService.postAccountRequestOTP();
  }

  private validateInput(verification: Verification) {
    if (verification?.secret == null || verification.secret === "") {
      if (verification.type === VerificationType.OTP) {
        throw new Error(this.i18nService.t("verificationCodeRequired"));
      } else {
        throw new Error(this.i18nService.t("masterPassRequired"));
      }
    }
  }
}
