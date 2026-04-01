import { enableProdMode, provideZoneChangeDetection } from "@angular/core";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";

import { isDev } from "@/jslib/electron/src/utils";

import "../scss/styles.scss";

import { AppModule } from "./app.module";

if (!isDev()) {
  enableProdMode();
}

if (!self.crossOriginIsolated) {
  document.body.innerHTML =
    '<p style="color:red;font-family:sans-serif;padding:2rem">' +
    "Cross-origin isolation is not active — SharedArrayBuffer is unavailable. " +
    "The app cannot start. Check that the app:// protocol handler is registered and " +
    "serving COOP/COEP headers correctly." +
    "</p>";
  throw new Error("Cross-origin isolation is required but not active.");
}

platformBrowserDynamic().bootstrapModule(AppModule, {
  applicationProviders: [provideZoneChangeDetection()],
  preserveWhitespaces: true,
});
