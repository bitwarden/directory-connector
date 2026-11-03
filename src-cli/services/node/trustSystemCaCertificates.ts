import * as tls from "tls";

import { LogService } from "@/libs/abstractions/log.service";

export function trustSystemCaCertificates(logService: LogService): void {
  try {
    tls.setDefaultCACertificates([
      ...tls.getCACertificates("default"),
      ...tls.getCACertificates("system"),
    ]);
  } catch (e) {
    logService.warning(
      `Failed to read system CA trust store, falling back to bundled CAs only: ${e}`,
    );
  }
}
