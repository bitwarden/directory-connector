import { net } from "electron";
import FormData from "form-data";

import { AppIdService } from "@/libs/abstractions/appId.service";
import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { StateService } from "@/libs/abstractions/state.service";
import { TokenService } from "@/libs/abstractions/token.service";
import { ApiService } from "@/libs/services/api.service";

(global as any).FormData = FormData;

export class NodeApiService extends ApiService {
  constructor(
    tokenService: TokenService,
    platformUtilsService: PlatformUtilsService,
    stateService: StateService,
    appIdService: AppIdService,
    logoutCallback: (expired: boolean) => Promise<void>,
    customUserAgent: string = null,
  ) {
    super(
      tokenService,
      platformUtilsService,
      stateService,
      appIdService,
      logoutCallback,
      customUserAgent,
    );
  }

  nativeFetch(request: Request): Promise<Response> {
    return net.fetch(request);
  }
}
