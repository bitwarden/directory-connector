import { EnvironmentUrls } from "@/jslib/common/src/models/domain/environmentUrls";

export { EnvironmentUrls };

export abstract class EnvironmentService {
  abstract setUrls(urls: EnvironmentUrls): Promise<void>;
  abstract setUrlsFromStorage(): Promise<void>;

  abstract hasBaseUrl(): boolean;
  abstract getApiUrl(): string;
  abstract getIdentityUrl(): string;
  abstract getWebVaultUrl(): string;
}
