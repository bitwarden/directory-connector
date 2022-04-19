import { Observable } from "rxjs";

export type Urls = {
  base?: string;
  webVault?: string;
  api?: string;
  identity?: string;
  icons?: string;
  notifications?: string;
  events?: string;
  keyConnector?: string;
};

export type PayPalConfig = {
  businessId?: string;
  buttonAction?: string;
};

export abstract class EnvironmentService {
  urls: Observable<Urls>;

  hasBaseUrl: () => boolean;
  getNotificationsUrl: () => string;
  getWebVaultUrl: () => string;
  getSendUrl: () => string;
  getIconsUrl: () => string;
  getApiUrl: () => string;
  getIdentityUrl: () => string;
  getEventsUrl: () => string;
  getKeyConnectorUrl: () => string;
  setUrlsFromStorage: () => Promise<void>;
  setUrls: (urls: Urls) => Promise<Urls>;
  getUrls: () => Urls;
}
