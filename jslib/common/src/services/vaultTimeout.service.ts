import { firstValueFrom } from "rxjs";

import { CipherService } from "../abstractions/cipher.service";
import { CollectionService } from "../abstractions/collection.service";
import { CryptoService } from "../abstractions/crypto.service";
import { FolderService } from "../abstractions/folder.service";
import { KeyConnectorService } from "../abstractions/keyConnector.service";
import { MessagingService } from "../abstractions/messaging.service";
import { PlatformUtilsService } from "../abstractions/platformUtils.service";
import { PolicyService } from "../abstractions/policy.service";
import { SearchService } from "../abstractions/search.service";
import { StateService } from "../abstractions/state.service";
import { TokenService } from "../abstractions/token.service";
import { VaultTimeoutService as VaultTimeoutServiceAbstraction } from "../abstractions/vaultTimeout.service";
import { KeySuffixOptions } from "../enums/keySuffixOptions";
import { PolicyType } from "../enums/policyType";

export class VaultTimeoutService implements VaultTimeoutServiceAbstraction {
  private inited = false;

  constructor(
    private cipherService: CipherService,
    private folderService: FolderService,
    private collectionService: CollectionService,
    private cryptoService: CryptoService,
    protected platformUtilsService: PlatformUtilsService,
    private messagingService: MessagingService,
    private searchService: SearchService,
    private tokenService: TokenService,
    private policyService: PolicyService,
    private keyConnectorService: KeyConnectorService,
    private stateService: StateService,
    private lockedCallback: (userId?: string) => Promise<void> = null,
    private loggedOutCallback: (userId?: string) => Promise<void> = null,
  ) {}

  init(checkOnInterval: boolean) {
    if (this.inited) {
      return;
    }

    this.inited = true;
    if (checkOnInterval) {
      this.startCheck();
    }
  }

  startCheck() {
    this.checkVaultTimeout();
    setInterval(() => this.checkVaultTimeout(), 10 * 1000); // check every 10 seconds
  }

  // Keys aren't stored for a device that is locked or logged out.
  async isLocked(userId?: string): Promise<boolean> {
    const neverLock =
      (await this.cryptoService.hasKeyStored(KeySuffixOptions.Auto, userId)) &&
      !(await this.stateService.getEverBeenUnlocked({ userId: userId }));
    if (neverLock) {
      // TODO: This also _sets_ the key so when we check memory in the next line it finds a key.
      // We should refactor here.
      await this.cryptoService.getKey(KeySuffixOptions.Auto, userId);
    }

    return !(await this.cryptoService.hasKeyInMemory(userId));
  }

  async checkVaultTimeout(): Promise<void> {
    if (await this.platformUtilsService.isViewOpen()) {
      return;
    }

    const accounts = await firstValueFrom(this.stateService.accounts$);
    for (const userId in accounts) {
      if (userId != null && (await this.shouldLock(userId))) {
        await this.executeTimeoutAction(userId);
      }
    }
  }

  async lock(allowSoftLock = false, userId?: string): Promise<void> {
    const authed = await this.stateService.getIsAuthenticated({ userId: userId });
    if (!authed) {
      return;
    }

    if (await this.keyConnectorService.getUsesKeyConnector()) {
      const pinSet = await this.isPinLockSet();
      const pinLock =
        (pinSet[0] && (await this.stateService.getDecryptedPinProtected()) != null) || pinSet[1];

      if (!pinLock && !(await this.isBiometricLockSet())) {
        await this.logOut(userId);
      }
    }

    if (userId == null || userId === (await this.stateService.getUserId())) {
      this.searchService.clearIndex();
    }

    await this.stateService.setEverBeenUnlocked(true, { userId: userId });
    await this.stateService.setBiometricLocked(true, { userId: userId });
    await this.stateService.setCryptoMasterKeyAuto(null, { userId: userId });

    await this.cryptoService.clearKey(false, userId);
    await this.cryptoService.clearOrgKeys(true, userId);
    await this.cryptoService.clearKeyPair(true, userId);
    await this.cryptoService.clearEncKey(true, userId);

    await this.folderService.clearCache(userId);
    await this.cipherService.clearCache(userId);
    await this.collectionService.clearCache(userId);

    this.messagingService.send("locked", { userId: userId });

    if (this.lockedCallback != null) {
      await this.lockedCallback(userId);
    }
  }

  async logOut(userId?: string): Promise<void> {
    if (this.loggedOutCallback != null) {
      await this.loggedOutCallback(userId);
    }
  }

  async setVaultTimeoutOptions(timeout: number, action: string): Promise<void> {
    await this.stateService.setVaultTimeout(timeout);

    // We swap these tokens from being on disk for lock actions, and in memory for logout actions
    // Get them here to set them to their new location after changing the timeout action and clearing if needed
    const token = await this.tokenService.getToken();
    const refreshToken = await this.tokenService.getRefreshToken();
    const clientId = await this.tokenService.getClientId();
    const clientSecret = await this.tokenService.getClientSecret();

    const currentAction = await this.stateService.getVaultTimeoutAction();
    if ((timeout != null || timeout === 0) && action === "logOut" && action !== currentAction) {
      // if we have a vault timeout and the action is log out, reset tokens
      await this.tokenService.clearToken();
    }

    await this.stateService.setVaultTimeoutAction(action);

    await this.tokenService.setToken(token);
    await this.tokenService.setRefreshToken(refreshToken);
    await this.tokenService.setClientId(clientId);
    await this.tokenService.setClientSecret(clientSecret);

    await this.cryptoService.toggleKey();
  }

  async isPinLockSet(): Promise<[boolean, boolean]> {
    const protectedPin = await this.stateService.getProtectedPin();
    const pinProtectedKey = await this.stateService.getEncryptedPinProtected();
    return [protectedPin != null, pinProtectedKey != null];
  }

  async isBiometricLockSet(): Promise<boolean> {
    return await this.stateService.getBiometricUnlock();
  }

  async getVaultTimeout(userId?: string): Promise<number> {
    const vaultTimeout = await this.stateService.getVaultTimeout({ userId: userId });

    if (
      await this.policyService.policyAppliesToUser(PolicyType.MaximumVaultTimeout, null, userId)
    ) {
      const policy = await this.policyService.getAll(PolicyType.MaximumVaultTimeout, userId);
      // Remove negative values, and ensure it's smaller than maximum allowed value according to policy
      let timeout = Math.min(vaultTimeout, policy[0].data.minutes);

      if (vaultTimeout == null || timeout < 0) {
        timeout = policy[0].data.minutes;
      }

      // We really shouldn't need to set the value here, but multiple services relies on this value being correct.
      if (vaultTimeout !== timeout) {
        await this.stateService.setVaultTimeout(timeout, { userId: userId });
      }

      return timeout;
    }

    return vaultTimeout;
  }

  async clear(userId?: string): Promise<void> {
    await this.stateService.setEverBeenUnlocked(false, { userId: userId });
    await this.stateService.setDecryptedPinProtected(null, { userId: userId });
    await this.stateService.setProtectedPin(null, { userId: userId });
  }

  private async isLoggedOut(userId?: string): Promise<boolean> {
    return !(await this.stateService.getIsAuthenticated({ userId: userId }));
  }

  private async shouldLock(userId: string): Promise<boolean> {
    if (await this.isLoggedOut(userId)) {
      return false;
    }

    if (await this.isLocked(userId)) {
      return false;
    }

    const vaultTimeout = await this.getVaultTimeout(userId);
    if (vaultTimeout == null || vaultTimeout < 0) {
      return false;
    }

    const lastActive = await this.stateService.getLastActive({ userId: userId });
    if (lastActive == null) {
      return false;
    }

    const vaultTimeoutSeconds = vaultTimeout * 60;
    const diffSeconds = (new Date().getTime() - lastActive) / 1000;
    return diffSeconds >= vaultTimeoutSeconds;
  }

  private async executeTimeoutAction(userId: string): Promise<void> {
    const timeoutAction = await this.stateService.getVaultTimeoutAction({ userId: userId });
    timeoutAction === "logOut" ? await this.logOut(userId) : await this.lock(true, userId);
  }
}
