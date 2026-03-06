import * as FormData from "form-data";
import { HttpsProxyAgent } from "https-proxy-agent";
import * as fe from "node-fetch";

import { AppIdService } from "@/libs/abstractions/appId.service";
import { EnvironmentService } from "@/libs/abstractions/environment.service";
import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { TokenService } from "@/libs/abstractions/token.service";
import { ApiService } from "@/libs/services/api.service";

(global as any).fetch = fe.default;
(global as any).Request = fe.Request;
(global as any).Response = fe.Response;
(global as any).Headers = fe.Headers;
(global as any).FormData = FormData;

export class NodeApiService extends ApiService {
  constructor(
    tokenService: TokenService,
    platformUtilsService: PlatformUtilsService,
    environmentService: EnvironmentService,
    appIdService: AppIdService,
    logoutCallback: (expired: boolean) => Promise<void>,
    customUserAgent: string = null,
  ) {
    super(
      tokenService,
      platformUtilsService,
      environmentService,
      appIdService,
      logoutCallback,
      customUserAgent,
    );
  }

  nativeFetch(request: Request): Promise<Response> {
    const proxy = process.env.http_proxy || process.env.https_proxy;
    if (proxy) {
      (request as any).agent = new HttpsProxyAgent(proxy);
    }
    return fetch(request);
  }
}
