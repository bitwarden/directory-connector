import { Directive } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { first } from "rxjs/operators";

import { ApiService } from "jslib-common/abstractions/api.service";
import { CryptoService } from "jslib-common/abstractions/crypto.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { MessagingService } from "jslib-common/abstractions/messaging.service";
import { PasswordGenerationService } from "jslib-common/abstractions/passwordGeneration.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { PolicyService } from "jslib-common/abstractions/policy.service";
import { StateService } from "jslib-common/abstractions/state.service";
import { SyncService } from "jslib-common/abstractions/sync.service";
import { HashPurpose } from "jslib-common/enums/hashPurpose";
import { DEFAULT_KDF_ITERATIONS, DEFAULT_KDF_TYPE } from "jslib-common/enums/kdfType";
import { Utils } from "jslib-common/misc/utils";
import { EncString } from "jslib-common/models/domain/encString";
import { SymmetricCryptoKey } from "jslib-common/models/domain/symmetricCryptoKey";
import { KeysRequest } from "jslib-common/models/request/keysRequest";
import { OrganizationUserResetPasswordEnrollmentRequest } from "jslib-common/models/request/organizationUserResetPasswordEnrollmentRequest";
import { SetPasswordRequest } from "jslib-common/models/request/setPasswordRequest";

import { ChangePasswordComponent as BaseChangePasswordComponent } from "./change-password.component";

@Directive()
export class SetPasswordComponent extends BaseChangePasswordComponent {
  syncLoading = true;
  showPassword = false;
  hint = "";
  identifier: string = null;
  orgId: string;
  resetPasswordAutoEnroll = false;

  onSuccessfulChangePassword: () => Promise<any>;
  successRoute = "vault";

  constructor(
    i18nService: I18nService,
    cryptoService: CryptoService,
    messagingService: MessagingService,
    passwordGenerationService: PasswordGenerationService,
    platformUtilsService: PlatformUtilsService,
    policyService: PolicyService,
    protected router: Router,
    private apiService: ApiService,
    private syncService: SyncService,
    private route: ActivatedRoute,
    stateService: StateService
  ) {
    super(
      i18nService,
      cryptoService,
      messagingService,
      passwordGenerationService,
      platformUtilsService,
      policyService,
      stateService
    );
  }

  async ngOnInit() {
    await this.syncService.fullSync(true);
    this.syncLoading = false;

    this.route.queryParams.pipe(first()).subscribe(async (qParams) => {
      if (qParams.identifier != null) {
        this.identifier = qParams.identifier;
      }
    });

    // Automatic Enrollment Detection
    if (this.identifier != null) {
      try {
        const response = await this.apiService.getOrganizationAutoEnrollStatus(this.identifier);
        this.orgId = response.id;
        this.resetPasswordAutoEnroll = response.resetPasswordEnabled;
        this.enforcedPolicyOptions =
          await this.policyService.getMasterPasswordPoliciesForInvitedUsers(this.orgId);
      } catch {
        this.platformUtilsService.showToast("error", null, this.i18nService.t("errorOccurred"));
      }
    }

    super.ngOnInit();
  }

  async setupSubmitActions() {
    this.kdf = DEFAULT_KDF_TYPE;
    this.kdfIterations = DEFAULT_KDF_ITERATIONS;
    return true;
  }

  async performSubmitActions(
    masterPasswordHash: string,
    key: SymmetricCryptoKey,
    encKey: [SymmetricCryptoKey, EncString]
  ) {
    const keys = await this.cryptoService.makeKeyPair(encKey[0]);
    const request = new SetPasswordRequest(
      masterPasswordHash,
      encKey[1].encryptedString,
      this.hint,
      this.kdf,
      this.kdfIterations,
      this.identifier,
      new KeysRequest(keys[0], keys[1].encryptedString)
    );
    try {
      if (this.resetPasswordAutoEnroll) {
        this.formPromise = this.apiService
          .setPassword(request)
          .then(async () => {
            await this.onSetPasswordSuccess(key, encKey, keys);
            return this.apiService.getOrganizationKeys(this.orgId);
          })
          .then(async (response) => {
            if (response == null) {
              throw new Error(this.i18nService.t("resetPasswordOrgKeysError"));
            }
            const userId = await this.stateService.getUserId();
            const publicKey = Utils.fromB64ToArray(response.publicKey);

            // RSA Encrypt user's encKey.key with organization public key
            const userEncKey = await this.cryptoService.getEncKey();
            const encryptedKey = await this.cryptoService.rsaEncrypt(
              userEncKey.key,
              publicKey.buffer
            );

            const resetRequest = new OrganizationUserResetPasswordEnrollmentRequest();
            resetRequest.resetPasswordKey = encryptedKey.encryptedString;

            return this.apiService.putOrganizationUserResetPasswordEnrollment(
              this.orgId,
              userId,
              resetRequest
            );
          });
      } else {
        this.formPromise = this.apiService.setPassword(request).then(async () => {
          await this.onSetPasswordSuccess(key, encKey, keys);
        });
      }

      await this.formPromise;

      if (this.onSuccessfulChangePassword != null) {
        this.onSuccessfulChangePassword();
      } else {
        this.router.navigate([this.successRoute]);
      }
    } catch {
      this.platformUtilsService.showToast("error", null, this.i18nService.t("errorOccurred"));
    }
  }

  togglePassword(confirmField: boolean) {
    this.showPassword = !this.showPassword;
    document.getElementById(confirmField ? "masterPasswordRetype" : "masterPassword").focus();
  }

  private async onSetPasswordSuccess(
    key: SymmetricCryptoKey,
    encKey: [SymmetricCryptoKey, EncString],
    keys: [string, EncString]
  ) {
    await this.stateService.setKdfType(this.kdf);
    await this.stateService.setKdfIterations(this.kdfIterations);
    await this.cryptoService.setKey(key);
    await this.cryptoService.setEncKey(encKey[1].encryptedString);
    await this.cryptoService.setEncPrivateKey(keys[1].encryptedString);

    const localKeyHash = await this.cryptoService.hashPassword(
      this.masterPassword,
      key,
      HashPurpose.LocalAuthorization
    );
    await this.cryptoService.setKeyHash(localKeyHash);
  }
}
