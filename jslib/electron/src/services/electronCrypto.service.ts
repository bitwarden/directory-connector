import { CryptoFunctionService } from "jslib-common/abstractions/cryptoFunction.service";
import { LogService } from "jslib-common/abstractions/log.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { StateService } from "jslib-common/abstractions/state.service";
import { KeySuffixOptions } from "jslib-common/enums/keySuffixOptions";
import { SymmetricCryptoKey } from "jslib-common/models/domain/symmetricCryptoKey";
import { CryptoService } from "jslib-common/services/crypto.service";

export class ElectronCryptoService extends CryptoService {
  constructor(
    cryptoFunctionService: CryptoFunctionService,
    platformUtilService: PlatformUtilsService,
    logService: LogService,
    stateService: StateService
  ) {
    super(cryptoFunctionService, platformUtilService, logService, stateService);
  }

  async hasKeyStored(keySuffix: KeySuffixOptions): Promise<boolean> {
    await this.upgradeSecurelyStoredKey();
    return super.hasKeyStored(keySuffix);
  }

  protected async storeKey(key: SymmetricCryptoKey, userId?: string) {
    if (await this.shouldStoreKey(KeySuffixOptions.Auto, userId)) {
      await this.stateService.setCryptoMasterKeyAuto(key.keyB64, { userId: userId });
    } else {
      this.clearStoredKey(KeySuffixOptions.Auto);
    }

    if (await this.shouldStoreKey(KeySuffixOptions.Biometric, userId)) {
      await this.stateService.setCryptoMasterKeyBiometric(key.keyB64, { userId: userId });
    } else {
      this.clearStoredKey(KeySuffixOptions.Biometric);
    }
  }

  protected async retrieveKeyFromStorage(keySuffix: KeySuffixOptions, userId?: string) {
    await this.upgradeSecurelyStoredKey();
    return super.retrieveKeyFromStorage(keySuffix, userId);
  }

  /**
   * @deprecated 4 Jun 2021 This is temporary upgrade method to move from a single shared stored key to
   * multiple, unique stored keys for each use, e.g. never logout vs. biometric authentication.
   */
  private async upgradeSecurelyStoredKey() {
    // attempt key upgrade, but if we fail just delete it. Keys will be stored property upon unlock anyway.
    const key = await this.stateService.getCryptoMasterKeyB64();

    if (key == null) {
      return;
    }

    try {
      if (await this.shouldStoreKey(KeySuffixOptions.Auto)) {
        await this.stateService.setCryptoMasterKeyAuto(key);
      }
      if (await this.shouldStoreKey(KeySuffixOptions.Biometric)) {
        await this.stateService.setCryptoMasterKeyBiometric(key);
      }
    } catch (e) {
      this.logService.error(
        `Encountered error while upgrading obsolete Bitwarden secure storage item:`
      );
      this.logService.error(e);
    }

    await this.stateService.setCryptoMasterKeyB64(null);
  }
}
