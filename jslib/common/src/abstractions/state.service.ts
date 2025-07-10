import { Observable } from "rxjs";

import { KdfType } from "../enums/kdfType";
import { ThemeType } from "../enums/themeType";
import { UriMatchType } from "../enums/uriMatchType";
import { CollectionData } from "../models/data/collectionData";
import { EventData } from "../models/data/eventData";
import { FolderData } from "../models/data/folderData";
import { OrganizationData } from "../models/data/organizationData";
import { PolicyData } from "../models/data/policyData";
import { ProviderData } from "../models/data/providerData";
import { Account } from "../models/domain/account";
import { EncString } from "../models/domain/encString";
import { EnvironmentUrls } from "../models/domain/environmentUrls";
import { GeneratedPasswordHistory } from "../models/domain/generatedPasswordHistory";
import { Policy } from "../models/domain/policy";
import { StorageOptions } from "../models/domain/storageOptions";
import { SymmetricCryptoKey } from "../models/domain/symmetricCryptoKey";
import { WindowState } from "../models/domain/windowState";
import { CollectionView } from "../models/view/collectionView";
import { FolderView } from "../models/view/folderView";

export abstract class StateService<T extends Account = Account> {
  accounts$: Observable<{ [userId: string]: T }>;
  activeAccount$: Observable<string>;

  addAccount: (account: T) => Promise<void>;
  setActiveUser: (userId: string) => Promise<void>;
  clean: (options?: StorageOptions) => Promise<void>;
  init: () => Promise<void>;

  getAccessToken: (options?: StorageOptions) => Promise<string>;
  setAccessToken: (value: string, options?: StorageOptions) => Promise<void>;
  getAddEditCipherInfo: (options?: StorageOptions) => Promise<any>;
  setAddEditCipherInfo: (value: any, options?: StorageOptions) => Promise<void>;
  getAlwaysShowDock: (options?: StorageOptions) => Promise<boolean>;
  setAlwaysShowDock: (value: boolean, options?: StorageOptions) => Promise<void>;
  getApiKeyClientId: (options?: StorageOptions) => Promise<string>;
  setApiKeyClientId: (value: string, options?: StorageOptions) => Promise<void>;
  getApiKeyClientSecret: (options?: StorageOptions) => Promise<string>;
  setApiKeyClientSecret: (value: string, options?: StorageOptions) => Promise<void>;
  getAutoConfirmFingerPrints: (options?: StorageOptions) => Promise<boolean>;
  setAutoConfirmFingerprints: (value: boolean, options?: StorageOptions) => Promise<void>;
  getAutoFillOnPageLoadDefault: (options?: StorageOptions) => Promise<boolean>;
  setAutoFillOnPageLoadDefault: (value: boolean, options?: StorageOptions) => Promise<void>;
  getBiometricAwaitingAcceptance: (options?: StorageOptions) => Promise<boolean>;
  setBiometricAwaitingAcceptance: (value: boolean, options?: StorageOptions) => Promise<void>;
  getBiometricFingerprintValidated: (options?: StorageOptions) => Promise<boolean>;
  setBiometricFingerprintValidated: (value: boolean, options?: StorageOptions) => Promise<void>;
  getBiometricLocked: (options?: StorageOptions) => Promise<boolean>;
  setBiometricLocked: (value: boolean, options?: StorageOptions) => Promise<void>;
  getBiometricText: (options?: StorageOptions) => Promise<string>;
  setBiometricText: (value: string, options?: StorageOptions) => Promise<void>;
  getBiometricUnlock: (options?: StorageOptions) => Promise<boolean>;
  setBiometricUnlock: (value: boolean, options?: StorageOptions) => Promise<void>;
  getCanAccessPremium: (options?: StorageOptions) => Promise<boolean>;
  getClearClipboard: (options?: StorageOptions) => Promise<number>;
  setClearClipboard: (value: number, options?: StorageOptions) => Promise<void>;
  getCollapsedGroupings: (options?: StorageOptions) => Promise<string[]>;
  setCollapsedGroupings: (value: string[], options?: StorageOptions) => Promise<void>;
  getConvertAccountToKeyConnector: (options?: StorageOptions) => Promise<boolean>;
  setConvertAccountToKeyConnector: (value: boolean, options?: StorageOptions) => Promise<void>;
  getCryptoMasterKey: (options?: StorageOptions) => Promise<SymmetricCryptoKey>;
  setCryptoMasterKey: (value: SymmetricCryptoKey, options?: StorageOptions) => Promise<void>;
  getCryptoMasterKeyAuto: (options?: StorageOptions) => Promise<string>;
  setCryptoMasterKeyAuto: (value: string, options?: StorageOptions) => Promise<void>;
  getCryptoMasterKeyB64: (options?: StorageOptions) => Promise<string>;
  setCryptoMasterKeyB64: (value: string, options?: StorageOptions) => Promise<void>;
  getCryptoMasterKeyBiometric: (options?: StorageOptions) => Promise<string>;
  hasCryptoMasterKeyBiometric: (options?: StorageOptions) => Promise<boolean>;
  setCryptoMasterKeyBiometric: (value: string, options?: StorageOptions) => Promise<void>;
  getDecodedToken: (options?: StorageOptions) => Promise<any>;
  setDecodedToken: (value: any, options?: StorageOptions) => Promise<void>;

  getDecryptedCollections: (options?: StorageOptions) => Promise<CollectionView[]>;
  setDecryptedCollections: (value: CollectionView[], options?: StorageOptions) => Promise<void>;
  getDecryptedCryptoSymmetricKey: (options?: StorageOptions) => Promise<SymmetricCryptoKey>;
  setDecryptedCryptoSymmetricKey: (
    value: SymmetricCryptoKey,
    options?: StorageOptions,
  ) => Promise<void>;
  getDecryptedFolders: (options?: StorageOptions) => Promise<FolderView[]>;
  setDecryptedFolders: (value: FolderView[], options?: StorageOptions) => Promise<void>;
  getDecryptedOrganizationKeys: (
    options?: StorageOptions,
  ) => Promise<Map<string, SymmetricCryptoKey>>;
  setDecryptedOrganizationKeys: (
    value: Map<string, SymmetricCryptoKey>,
    options?: StorageOptions,
  ) => Promise<void>;
  getDecryptedPasswordGenerationHistory: (
    options?: StorageOptions,
  ) => Promise<GeneratedPasswordHistory[]>;
  setDecryptedPasswordGenerationHistory: (
    value: GeneratedPasswordHistory[],
    options?: StorageOptions,
  ) => Promise<void>;
  getDecryptedPinProtected: (options?: StorageOptions) => Promise<EncString>;
  setDecryptedPinProtected: (value: EncString, options?: StorageOptions) => Promise<void>;
  getDecryptedPolicies: (options?: StorageOptions) => Promise<Policy[]>;
  setDecryptedPolicies: (value: Policy[], options?: StorageOptions) => Promise<void>;
  getDecryptedPrivateKey: (options?: StorageOptions) => Promise<ArrayBuffer>;
  setDecryptedPrivateKey: (value: ArrayBuffer, options?: StorageOptions) => Promise<void>;
  getDecryptedProviderKeys: (options?: StorageOptions) => Promise<Map<string, SymmetricCryptoKey>>;
  setDecryptedProviderKeys: (
    value: Map<string, SymmetricCryptoKey>,
    options?: StorageOptions,
  ) => Promise<void>;

  getDefaultUriMatch: (options?: StorageOptions) => Promise<UriMatchType>;
  setDefaultUriMatch: (value: UriMatchType, options?: StorageOptions) => Promise<void>;
  getDisableAddLoginNotification: (options?: StorageOptions) => Promise<boolean>;
  setDisableAddLoginNotification: (value: boolean, options?: StorageOptions) => Promise<void>;
  getDisableAutoBiometricsPrompt: (options?: StorageOptions) => Promise<boolean>;
  setDisableAutoBiometricsPrompt: (value: boolean, options?: StorageOptions) => Promise<void>;
  getDisableAutoTotpCopy: (options?: StorageOptions) => Promise<boolean>;
  setDisableAutoTotpCopy: (value: boolean, options?: StorageOptions) => Promise<void>;
  getDisableBadgeCounter: (options?: StorageOptions) => Promise<boolean>;
  setDisableBadgeCounter: (value: boolean, options?: StorageOptions) => Promise<void>;
  getDisableChangedPasswordNotification: (options?: StorageOptions) => Promise<boolean>;
  setDisableChangedPasswordNotification: (
    value: boolean,
    options?: StorageOptions,
  ) => Promise<void>;
  getDisableContextMenuItem: (options?: StorageOptions) => Promise<boolean>;
  setDisableContextMenuItem: (value: boolean, options?: StorageOptions) => Promise<void>;
  getDisableFavicon: (options?: StorageOptions) => Promise<boolean>;
  setDisableFavicon: (value: boolean, options?: StorageOptions) => Promise<void>;
  getDisableGa: (options?: StorageOptions) => Promise<boolean>;
  setDisableGa: (value: boolean, options?: StorageOptions) => Promise<void>;
  getDontShowCardsCurrentTab: (options?: StorageOptions) => Promise<boolean>;
  setDontShowCardsCurrentTab: (value: boolean, options?: StorageOptions) => Promise<void>;
  getDontShowIdentitiesCurrentTab: (options?: StorageOptions) => Promise<boolean>;
  setDontShowIdentitiesCurrentTab: (value: boolean, options?: StorageOptions) => Promise<void>;
  getEmail: (options?: StorageOptions) => Promise<string>;
  setEmail: (value: string, options?: StorageOptions) => Promise<void>;
  getEmailVerified: (options?: StorageOptions) => Promise<boolean>;
  setEmailVerified: (value: boolean, options?: StorageOptions) => Promise<void>;
  getEnableAlwaysOnTop: (options?: StorageOptions) => Promise<boolean>;
  setEnableAlwaysOnTop: (value: boolean, options?: StorageOptions) => Promise<void>;
  getEnableAutoFillOnPageLoad: (options?: StorageOptions) => Promise<boolean>;
  setEnableAutoFillOnPageLoad: (value: boolean, options?: StorageOptions) => Promise<void>;
  getEnableBiometric: (options?: StorageOptions) => Promise<boolean>;
  setEnableBiometric: (value: boolean, options?: StorageOptions) => Promise<void>;
  getEnableBrowserIntegration: (options?: StorageOptions) => Promise<boolean>;
  setEnableBrowserIntegration: (value: boolean, options?: StorageOptions) => Promise<void>;
  getEnableBrowserIntegrationFingerprint: (options?: StorageOptions) => Promise<boolean>;
  setEnableBrowserIntegrationFingerprint: (
    value: boolean,
    options?: StorageOptions,
  ) => Promise<void>;
  getEnableCloseToTray: (options?: StorageOptions) => Promise<boolean>;
  setEnableCloseToTray: (value: boolean, options?: StorageOptions) => Promise<void>;
  getEnableFullWidth: (options?: StorageOptions) => Promise<boolean>;
  setEnableFullWidth: (value: boolean, options?: StorageOptions) => Promise<void>;
  getEnableGravitars: (options?: StorageOptions) => Promise<boolean>;
  setEnableGravitars: (value: boolean, options?: StorageOptions) => Promise<void>;
  getEnableMinimizeToTray: (options?: StorageOptions) => Promise<boolean>;
  setEnableMinimizeToTray: (value: boolean, options?: StorageOptions) => Promise<void>;
  getEnableStartToTray: (options?: StorageOptions) => Promise<boolean>;
  setEnableStartToTray: (value: boolean, options?: StorageOptions) => Promise<void>;
  getEnableTray: (options?: StorageOptions) => Promise<boolean>;
  setEnableTray: (value: boolean, options?: StorageOptions) => Promise<void>;

  getEncryptedCollections: (options?: StorageOptions) => Promise<{ [id: string]: CollectionData }>;
  setEncryptedCollections: (
    value: { [id: string]: CollectionData },
    options?: StorageOptions,
  ) => Promise<void>;
  getEncryptedCryptoSymmetricKey: (options?: StorageOptions) => Promise<string>;
  setEncryptedCryptoSymmetricKey: (value: string, options?: StorageOptions) => Promise<void>;
  getEncryptedFolders: (options?: StorageOptions) => Promise<{ [id: string]: FolderData }>;
  setEncryptedFolders: (
    value: { [id: string]: FolderData },
    options?: StorageOptions,
  ) => Promise<void>;
  getEncryptedOrganizationKeys: (options?: StorageOptions) => Promise<any>;
  setEncryptedOrganizationKeys: (
    value: Map<string, SymmetricCryptoKey>,
    options?: StorageOptions,
  ) => Promise<void>;
  getEncryptedPasswordGenerationHistory: (
    options?: StorageOptions,
  ) => Promise<GeneratedPasswordHistory[]>;
  setEncryptedPasswordGenerationHistory: (
    value: GeneratedPasswordHistory[],
    options?: StorageOptions,
  ) => Promise<void>;
  getEncryptedPinProtected: (options?: StorageOptions) => Promise<string>;
  setEncryptedPinProtected: (value: string, options?: StorageOptions) => Promise<void>;
  getEncryptedPolicies: (options?: StorageOptions) => Promise<{ [id: string]: PolicyData }>;
  setEncryptedPolicies: (
    value: { [id: string]: PolicyData },
    options?: StorageOptions,
  ) => Promise<void>;
  getEncryptedPrivateKey: (options?: StorageOptions) => Promise<string>;
  setEncryptedPrivateKey: (value: string, options?: StorageOptions) => Promise<void>;
  getEncryptedProviderKeys: (options?: StorageOptions) => Promise<any>;
  setEncryptedProviderKeys: (value: any, options?: StorageOptions) => Promise<void>;

  getEntityId: (options?: StorageOptions) => Promise<string>;
  getEnvironmentUrls: (options?: StorageOptions) => Promise<EnvironmentUrls>;
  setEnvironmentUrls: (value: EnvironmentUrls, options?: StorageOptions) => Promise<void>;
  getEquivalentDomains: (options?: StorageOptions) => Promise<any>;
  setEquivalentDomains: (value: string, options?: StorageOptions) => Promise<void>;
  getEventCollection: (options?: StorageOptions) => Promise<EventData[]>;
  setEventCollection: (value: EventData[], options?: StorageOptions) => Promise<void>;
  getEverBeenUnlocked: (options?: StorageOptions) => Promise<boolean>;
  setEverBeenUnlocked: (value: boolean, options?: StorageOptions) => Promise<void>;
  getForcePasswordReset: (options?: StorageOptions) => Promise<boolean>;
  setForcePasswordReset: (value: boolean, options?: StorageOptions) => Promise<void>;
  getInstalledVersion: (options?: StorageOptions) => Promise<string>;
  setInstalledVersion: (value: string, options?: StorageOptions) => Promise<void>;
  getIsAuthenticated: (options?: StorageOptions) => Promise<boolean>;
  getKdfIterations: (options?: StorageOptions) => Promise<number>;
  setKdfIterations: (value: number, options?: StorageOptions) => Promise<void>;
  getKdfType: (options?: StorageOptions) => Promise<KdfType>;
  setKdfType: (value: KdfType, options?: StorageOptions) => Promise<void>;
  getKeyHash: (options?: StorageOptions) => Promise<string>;
  setKeyHash: (value: string, options?: StorageOptions) => Promise<void>;
  getLastActive: (options?: StorageOptions) => Promise<number>;
  setLastActive: (value: number, options?: StorageOptions) => Promise<void>;
  getLastSync: (options?: StorageOptions) => Promise<string>;
  setLastSync: (value: string, options?: StorageOptions) => Promise<void>;
  getLegacyEtmKey: (options?: StorageOptions) => Promise<SymmetricCryptoKey>;
  setLegacyEtmKey: (value: SymmetricCryptoKey, options?: StorageOptions) => Promise<void>;
  getLocalData: (options?: StorageOptions) => Promise<any>;
  setLocalData: (value: string, options?: StorageOptions) => Promise<void>;
  getLocale: (options?: StorageOptions) => Promise<string>;
  setLocale: (value: string, options?: StorageOptions) => Promise<void>;
  getLoginRedirect: (options?: StorageOptions) => Promise<any>;
  setLoginRedirect: (value: any, options?: StorageOptions) => Promise<void>;
  getMainWindowSize: (options?: StorageOptions) => Promise<number>;
  setMainWindowSize: (value: number, options?: StorageOptions) => Promise<void>;
  getMinimizeOnCopyToClipboard: (options?: StorageOptions) => Promise<boolean>;
  setMinimizeOnCopyToClipboard: (value: boolean, options?: StorageOptions) => Promise<void>;
  getNeverDomains: (options?: StorageOptions) => Promise<{ [id: string]: any }>;
  setNeverDomains: (value: { [id: string]: any }, options?: StorageOptions) => Promise<void>;
  getNoAutoPromptBiometrics: (options?: StorageOptions) => Promise<boolean>;
  setNoAutoPromptBiometrics: (value: boolean, options?: StorageOptions) => Promise<void>;
  getNoAutoPromptBiometricsText: (options?: StorageOptions) => Promise<string>;
  setNoAutoPromptBiometricsText: (value: string, options?: StorageOptions) => Promise<void>;
  getOpenAtLogin: (options?: StorageOptions) => Promise<boolean>;
  setOpenAtLogin: (value: boolean, options?: StorageOptions) => Promise<void>;
  getOrganizationInvitation: (options?: StorageOptions) => Promise<any>;
  setOrganizationInvitation: (value: any, options?: StorageOptions) => Promise<void>;
  getOrganizations: (options?: StorageOptions) => Promise<{ [id: string]: OrganizationData }>;
  setOrganizations: (
    value: { [id: string]: OrganizationData },
    options?: StorageOptions,
  ) => Promise<void>;
  getPasswordGenerationOptions: (options?: StorageOptions) => Promise<any>;
  setPasswordGenerationOptions: (value: any, options?: StorageOptions) => Promise<void>;
  getUsernameGenerationOptions: (options?: StorageOptions) => Promise<any>;
  setUsernameGenerationOptions: (value: any, options?: StorageOptions) => Promise<void>;
  getGeneratorOptions: (options?: StorageOptions) => Promise<any>;
  setGeneratorOptions: (value: any, options?: StorageOptions) => Promise<void>;
  getProtectedPin: (options?: StorageOptions) => Promise<string>;
  setProtectedPin: (value: string, options?: StorageOptions) => Promise<void>;
  getProviders: (options?: StorageOptions) => Promise<{ [id: string]: ProviderData }>;
  setProviders: (value: { [id: string]: ProviderData }, options?: StorageOptions) => Promise<void>;
  getPublicKey: (options?: StorageOptions) => Promise<ArrayBuffer>;
  setPublicKey: (value: ArrayBuffer, options?: StorageOptions) => Promise<void>;
  getRefreshToken: (options?: StorageOptions) => Promise<string>;
  setRefreshToken: (value: string, options?: StorageOptions) => Promise<void>;
  getRememberedEmail: (options?: StorageOptions) => Promise<string>;
  setRememberedEmail: (value: string, options?: StorageOptions) => Promise<void>;
  getSecurityStamp: (options?: StorageOptions) => Promise<string>;
  setSecurityStamp: (value: string, options?: StorageOptions) => Promise<void>;
  getSettings: (options?: StorageOptions) => Promise<any>;
  setSettings: (value: string, options?: StorageOptions) => Promise<void>;
  getSsoCodeVerifier: (options?: StorageOptions) => Promise<string>;
  setSsoCodeVerifier: (value: string, options?: StorageOptions) => Promise<void>;
  getSsoOrgIdentifier: (options?: StorageOptions) => Promise<string>;
  setSsoOrganizationIdentifier: (value: string, options?: StorageOptions) => Promise<void>;
  getSsoState: (options?: StorageOptions) => Promise<string>;
  setSsoState: (value: string, options?: StorageOptions) => Promise<void>;
  getTheme: (options?: StorageOptions) => Promise<ThemeType>;
  setTheme: (value: ThemeType, options?: StorageOptions) => Promise<void>;
  getTwoFactorToken: (options?: StorageOptions) => Promise<string>;
  setTwoFactorToken: (value: string, options?: StorageOptions) => Promise<void>;
  getUserId: (options?: StorageOptions) => Promise<string>;
  getUsesKeyConnector: (options?: StorageOptions) => Promise<boolean>;
  setUsesKeyConnector: (vaule: boolean, options?: StorageOptions) => Promise<void>;
  getVaultTimeout: (options?: StorageOptions) => Promise<number>;
  setVaultTimeout: (value: number, options?: StorageOptions) => Promise<void>;
  getVaultTimeoutAction: (options?: StorageOptions) => Promise<string>;
  setVaultTimeoutAction: (value: string, options?: StorageOptions) => Promise<void>;
  getStateVersion: () => Promise<number>;
  setStateVersion: (value: number) => Promise<void>;
  getWindow: () => Promise<WindowState>;
  setWindow: (value: WindowState) => Promise<void>;
}
