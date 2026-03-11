import { EnvironmentUrls } from "@/jslib/common/src/models/domain/environmentUrls";

import { EnvironmentService as IEnvironmentService } from "@/src/abstractions/environment.service";
import { StateService } from "@/src/abstractions/state.service";

export class EnvironmentService implements IEnvironmentService {
  private readonly DEFAULT_URLS = {
    api: "https://api.bitwarden.com",
    identity: "https://identity.bitwarden.com",
    webVault: "https://vault.bitwarden.com",
  };

  private urls: EnvironmentUrls = new EnvironmentUrls();

  constructor(private stateService: StateService) {}

  async setUrls(urls: EnvironmentUrls): Promise<void> {
    const normalized = new EnvironmentUrls();

    for (const [key, value] of Object.entries(urls)) {
      if (!value || typeof value !== "string") {
        continue;
      }
      normalized[key as keyof EnvironmentUrls] = this.formatUrl(value);
    }

    this.urls = normalized;
    await this.stateService.setEnvironmentUrls(normalized);
  }

  private formatUrl(url: string): string {
    url = url.trim().replace(/\/+$/, "");

    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    return url;
  }

  async setUrlsFromStorage(): Promise<void> {
    const stored = await this.stateService.getEnvironmentUrls();
    this.urls = stored ?? new EnvironmentUrls();
  }

  hasBaseUrl(): boolean {
    return !!this.urls.base;
  }

  getApiUrl(): string {
    if (this.urls.api) {
      return this.urls.api;
    }
    if (this.urls.base) {
      return this.urls.base + "/api";
    }
    return this.DEFAULT_URLS.api;
  }

  getIdentityUrl(): string {
    if (this.urls.identity) {
      return this.urls.identity;
    }
    if (this.urls.base) {
      return this.urls.base + "/identity";
    }
    return this.DEFAULT_URLS.identity;
  }

  getWebVaultUrl(): string {
    if (this.urls.webVault) {
      return this.urls.webVault;
    }
    if (this.urls.base) {
      return this.urls.base;
    }
    return this.DEFAULT_URLS.webVault;
  }
}
