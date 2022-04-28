import { CryptoService } from "../abstractions/crypto.service";

export class ContainerService {
  constructor(private cryptoService: CryptoService) {}

  // deprecated, use attachToGlobal instead
  attachToWindow(win: any) {
    this.attachToGlobal(win);
  }

  attachToGlobal(global: any) {
    if (!global.bitwardenContainerService) {
      global.bitwardenContainerService = this;
    }
  }

  getCryptoService(): CryptoService {
    return this.cryptoService;
  }
}
