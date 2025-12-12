import * as FormData from "form-data";
import { HttpsProxyAgent } from "https-proxy-agent";
import fetch, {
  Headers as NodeFetchHeaders,
  Request as NodeFetchRequest,
  Response as NodeFetchResponse,
} from "node-fetch";

import { AppIdService } from "@/jslib/common/src/abstractions/appId.service";
import { EnvironmentService } from "@/jslib/common/src/abstractions/environment.service";
import { PlatformUtilsService } from "@/jslib/common/src/abstractions/platformUtils.service";
import { TokenService } from "@/jslib/common/src/abstractions/token.service";
import { ApiService } from "@/jslib/common/src/services/api.service";

(global as any).fetch = fetch;
(global as any).Request = NodeFetchRequest;
(global as any).Response = NodeFetchResponse;
(global as any).Headers = NodeFetchHeaders;
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
    return fetch(request as any) as any;
  }
}
