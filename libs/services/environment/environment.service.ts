import { Observable, Subject } from "rxjs";

import { EnvironmentService } from "@/libs/abstractions/environment.service";
import { StateService } from "@/libs/abstractions/state.service";
import { EnvironmentUrls } from "@/libs/models/domain/environmentUrls";

export class DefaultEnvironmentService implements EnvironmentService {
  private readonly urlsSubject = new Subject<EnvironmentUrls>();
  urls: Observable<EnvironmentUrls> = this.urlsSubject;

  private baseUrl: string;
  private webVaultUrl: string;
  private apiUrl: string;
  private identityUrl: string;

  constructor(private stateService: StateService) {
    this.setUrlsFromStorage();
  }

  hasBaseUrl() {
    return this.baseUrl != null;
  }

  getWebVaultUrl() {
    if (this.webVaultUrl != null) {
      return this.webVaultUrl;
    }

    if (this.baseUrl) {
      return this.baseUrl;
    }
    return "https://vault.bitwarden.com";
  }

  getSendUrl() {
    return this.getWebVaultUrl() === "https://vault.bitwarden.com"
      ? "https://send.bitwarden.com/#"
      : this.getWebVaultUrl() + "/#/send/";
  }

  getApiUrl() {
    if (this.apiUrl != null) {
      return this.apiUrl;
    }

    if (this.baseUrl) {
      return this.baseUrl + "/api";
    }

    return "https://api.bitwarden.com";
  }

  getIdentityUrl() {
    if (this.identityUrl != null) {
      return this.identityUrl;
    }

    if (this.baseUrl) {
      return this.baseUrl + "/identity";
    }

    return "https://identity.bitwarden.com";
  }

  async setUrlsFromStorage(): Promise<void> {
    const urls = await this.stateService.getEnvironmentUrls();
    if (urls == null) {
      return;
    }

    const envUrls = new EnvironmentUrls();

    this.baseUrl = envUrls.base = urls.base;
    this.webVaultUrl = urls.webVault;
    this.apiUrl = envUrls.api = urls.api;
    this.identityUrl = envUrls.identity = urls.identity;
  }

  async setUrls(urls: EnvironmentUrls): Promise<void> {
    urls.base = this.formatUrl(urls.base);
    urls.webVault = this.formatUrl(urls.webVault);
    urls.api = this.formatUrl(urls.api);
    urls.identity = this.formatUrl(urls.identity);

    await this.stateService.setEnvironmentUrls({
      base: urls.base,
      api: urls.api,
      identity: urls.identity,
      webVault: urls.webVault,
    });

    this.baseUrl = urls.base;
    this.webVaultUrl = urls.webVault;
    this.apiUrl = urls.api;
    this.identityUrl = urls.identity;

    this.urlsSubject.next(urls);
  }

  getUrls() {
    return {
      base: this.baseUrl,
      webVault: this.webVaultUrl,
      api: this.apiUrl,
      identity: this.identityUrl,
    };
  }

  private formatUrl(url: string): string {
    if (url == null || url === "") {
      return null;
    }

    url = url.replace(/\/+$/g, "");
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    return url.trim();
  }
}
