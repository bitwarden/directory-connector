import { enableProdMode, provideZoneChangeDetection } from "@angular/core";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";

import { isDev } from "@/jslib/electron/src/utils";

import { AppModule } from "./app.module";

if (!isDev()) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule, {
  applicationProviders: [provideZoneChangeDetection()],
  preserveWhitespaces: true,
});
