import { AppIdService } from "@/jslib/common/src/abstractions/appId.service";
import { DeviceRequest } from "@/jslib/common/src/models/request/deviceRequest";
import { TokenRequestTwoFactor } from "@/jslib/common/src/models/request/identityToken/tokenRequestTwoFactor";

import { ApiService as ApiServiceAbstraction } from "../abstractions/api.service";
import { EnvironmentService } from "../abstractions/environment.service";
import { PlatformUtilsService } from "../abstractions/platformUtils.service";
import { TokenService } from "../abstractions/token.service";
import { DeviceType } from "../enums/deviceType";
import { Utils } from "../misc/utils";
import { ApiTokenRequest } from "../models/request/identityToken/apiTokenRequest";
import { PasswordTokenRequest } from "../models/request/identityToken/passwordTokenRequest";
import { SsoTokenRequest } from "../models/request/identityToken/ssoTokenRequest";
import { OrganizationImportRequest } from "../models/request/organizationImportRequest";
import { ErrorResponse } from "../models/response/errorResponse";
import { IdentityCaptchaResponse } from "../models/response/identityCaptchaResponse";
import { IdentityTokenResponse } from "../models/response/identityTokenResponse";
import { IdentityTwoFactorResponse } from "../models/response/identityTwoFactorResponse";

export class ApiService implements ApiServiceAbstraction {
  private device: DeviceType;
  private deviceType: string;
  private isWebClient = false;
  private isDesktopClient = false;

  constructor(
    private tokenService: TokenService,
    private platformUtilsService: PlatformUtilsService,
    private environmentService: EnvironmentService,
    private appIdService: AppIdService,
    private logoutCallback: (expired: boolean) => Promise<void>,
    private customUserAgent: string = null,
  ) {
    this.device = platformUtilsService.getDevice();
    this.deviceType = this.device.toString();
    this.isWebClient =
      this.device === DeviceType.IEBrowser ||
      this.device === DeviceType.ChromeBrowser ||
      this.device === DeviceType.EdgeBrowser ||
      this.device === DeviceType.FirefoxBrowser ||
      this.device === DeviceType.OperaBrowser ||
      this.device === DeviceType.SafariBrowser ||
      this.device === DeviceType.UnknownBrowser ||
      this.device === DeviceType.VivaldiBrowser;
    this.isDesktopClient =
      this.device === DeviceType.WindowsDesktop ||
      this.device === DeviceType.MacOsDesktop ||
      this.device === DeviceType.LinuxDesktop;
  }

  // Auth APIs

  async postIdentityToken(
    request: ApiTokenRequest | PasswordTokenRequest | SsoTokenRequest,
  ): Promise<IdentityTokenResponse | IdentityTwoFactorResponse | IdentityCaptchaResponse> {
    const headers = new Headers({
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      Accept: "application/json",
      "Device-Type": this.deviceType,
    });
    if (this.customUserAgent != null) {
      headers.set("User-Agent", this.customUserAgent);
    }
    request.alterIdentityTokenHeaders(headers);

    const identityToken =
      request instanceof ApiTokenRequest
        ? request.toIdentityToken()
        : request.toIdentityToken(this.platformUtilsService.getClientType());

    const response = await this.fetch(
      new Request(this.environmentService.getIdentityUrl() + "/connect/token", {
        body: this.qsStringify(identityToken),
        credentials: this.getCredentials(),
        cache: "no-store",
        headers: headers,
        method: "POST",
      }),
    );

    let responseJson: any = null;
    if (this.isJsonResponse(response)) {
      responseJson = await response.json();
    }

    if (responseJson != null) {
      if (response.status === 200) {
        return new IdentityTokenResponse(responseJson);
      } else if (
        response.status === 400 &&
        responseJson.TwoFactorProviders2 &&
        Object.keys(responseJson.TwoFactorProviders2).length
      ) {
        await this.tokenService.clearTwoFactorToken();
        return new IdentityTwoFactorResponse(responseJson);
      } else if (
        response.status === 400 &&
        responseJson.HCaptcha_SiteKey &&
        Object.keys(responseJson.HCaptcha_SiteKey).length
      ) {
        return new IdentityCaptchaResponse(responseJson);
      }
    }

    return Promise.reject(new ErrorResponse(responseJson, response.status, true));
  }

  async postPublicImportDirectory(request: OrganizationImportRequest): Promise<any> {
    return this.send("POST", "/public/organization/import", request, true, false);
  }

  // Helpers

  private async getActiveBearerToken(): Promise<string> {
    let accessToken = await this.tokenService.getToken();
    if (await this.tokenService.tokenNeedsRefresh()) {
      await this.doAuthRefresh();
      accessToken = await this.tokenService.getToken();
    }
    return accessToken;
  }

  private async fetch(request: Request): Promise<Response> {
    if (request.method === "GET") {
      request.headers.set("Cache-Control", "no-store");
      request.headers.set("Pragma", "no-cache");
    }
    request.headers.set("Bitwarden-Client-Name", this.platformUtilsService.getClientType());
    request.headers.set(
      "Bitwarden-Client-Version",
      await this.platformUtilsService.getApplicationVersion(),
    );
    return this.nativeFetch(request);
  }

  protected nativeFetch(request: Request): Promise<Response> {
    return fetch(request);
  }

  protected async doAuthRefresh(): Promise<void> {
    const refreshToken = await this.tokenService.getRefreshToken();
    if (refreshToken != null && refreshToken !== "") {
      return this.doRefreshToken();
    }

    const clientId = await this.tokenService.getClientId();
    const clientSecret = await this.tokenService.getClientSecret();
    if (!Utils.isNullOrWhitespace(clientId) && !Utils.isNullOrWhitespace(clientSecret)) {
      return this.doApiTokenRefresh();
    }

    throw new Error("Cannot refresh token, no refresh token or api keys are stored");
  }

  protected async doRefreshToken(): Promise<void> {
    const refreshToken = await this.tokenService.getRefreshToken();
    if (refreshToken == null || refreshToken === "") {
      throw new Error();
    }
    const headers = new Headers({
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      Accept: "application/json",
      "Device-Type": this.deviceType,
    });
    if (this.customUserAgent != null) {
      headers.set("User-Agent", this.customUserAgent);
    }

    const decodedToken = await this.tokenService.decodeToken();
    const response = await this.fetch(
      new Request(this.environmentService.getIdentityUrl() + "/connect/token", {
        body: this.qsStringify({
          grant_type: "refresh_token",
          client_id: decodedToken.client_id,
          refresh_token: refreshToken,
        }),
        cache: "no-store",
        credentials: this.getCredentials(),
        headers: headers,
        method: "POST",
      }),
    );

    if (response.status === 200) {
      const responseJson = await response.json();
      const tokenResponse = new IdentityTokenResponse(responseJson);
      await this.tokenService.setTokens(
        tokenResponse.accessToken,
        tokenResponse.refreshToken,
        null,
      );
    } else {
      const error = await this.handleError(response, true, true);
      return Promise.reject(error);
    }
  }

  protected async doApiTokenRefresh(): Promise<void> {
    const clientId = await this.tokenService.getClientId();
    const clientSecret = await this.tokenService.getClientSecret();

    const appId = await this.appIdService.getAppId();
    const deviceRequest = new DeviceRequest(appId, this.platformUtilsService);

    const tokenRequest = new ApiTokenRequest(
      clientId,
      clientSecret,
      new TokenRequestTwoFactor(),
      deviceRequest,
    );

    const response = await this.postIdentityToken(tokenRequest);
    if (!(response instanceof IdentityTokenResponse)) {
      throw new Error("Invalid response received when refreshing api token");
    }

    await this.tokenService.setTokens(response.accessToken, response.refreshToken, [
      clientId,
      clientSecret,
    ]);
  }

  private async send(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body: any,
    authed: boolean,
    hasResponse: boolean,
    apiUrl?: string,
    alterHeaders?: (headers: Headers) => void,
  ): Promise<any> {
    apiUrl = Utils.isNullOrWhitespace(apiUrl) ? this.environmentService.getApiUrl() : apiUrl;

    const requestUrl = apiUrl + path;
    // Prevent directory traversal from malicious paths
    if (new URL(requestUrl).href !== requestUrl) {
      return Promise.reject("Invalid request url path.");
    }

    const headers = new Headers({
      "Device-Type": this.deviceType,
    });
    if (this.customUserAgent != null) {
      headers.set("User-Agent", this.customUserAgent);
    }

    const requestInit: RequestInit = {
      cache: "no-store",
      credentials: this.getCredentials(),
      method: method,
    };

    if (authed) {
      const authHeader = await this.getActiveBearerToken();
      headers.set("Authorization", "Bearer " + authHeader);
    }
    if (body != null) {
      if (typeof body === "string") {
        requestInit.body = body;
        headers.set("Content-Type", "application/x-www-form-urlencoded; charset=utf-8");
      } else if (typeof body === "object") {
        if (body instanceof FormData) {
          requestInit.body = body;
        } else {
          headers.set("Content-Type", "application/json; charset=utf-8");
          requestInit.body = JSON.stringify(body);
        }
      }
    }
    if (hasResponse) {
      headers.set("Accept", "application/json");
    }
    if (alterHeaders != null) {
      alterHeaders(headers);
    }

    requestInit.headers = headers;
    const response = await this.fetch(new Request(requestUrl, requestInit));

    if (hasResponse && response.status === 200) {
      const responseJson = await response.json();
      return responseJson;
    } else if (response.status !== 200) {
      const error = await this.handleError(response, false, authed);
      return Promise.reject(error);
    }
  }

  private async handleError(
    response: Response,
    tokenError: boolean,
    authed: boolean,
  ): Promise<ErrorResponse> {
    if (
      authed &&
      ((tokenError && response.status === 400) ||
        response.status === 401 ||
        response.status === 403)
    ) {
      await this.logoutCallback(true);
      return null;
    }

    let responseJson: any = null;
    if (this.isJsonResponse(response)) {
      responseJson = await response.json();
    } else if (this.isTextResponse(response)) {
      responseJson = { Message: await response.text() };
    }

    return new ErrorResponse(responseJson, response.status, tokenError);
  }

  private qsStringify(params: any): string {
    return Object.keys(params)
      .map((key) => {
        return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
      })
      .join("&");
  }

  private getCredentials(): RequestCredentials {
    if (!this.isWebClient || this.environmentService.hasBaseUrl()) {
      return "include";
    }
    return undefined;
  }

  private isJsonResponse(response: Response): boolean {
    const typeHeader = response.headers.get("content-type");
    return typeHeader != null && typeHeader.indexOf("application/json") > -1;
  }

  private isTextResponse(response: Response): boolean {
    const typeHeader = response.headers.get("content-type");
    return typeHeader != null && typeHeader.indexOf("text") > -1;
  }
}
