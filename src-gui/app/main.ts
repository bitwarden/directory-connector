import { enableProdMode, importProvidersFrom, provideZonelessChangeDetection } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideRouter, withHashLocation } from "@angular/router";

import { LogLevelType } from "@/libs/enums/logLevelType";

import { BitwardenToastModule } from "@/src-gui/angular/components/toastr.component";
import "../scss/styles.scss";

import { routes } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { servicesProviders } from "./services/services.module";

if (!ipc.process.isDev) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideAnimations(),
    provideRouter(routes, withHashLocation()),
    importProvidersFrom(
      BitwardenToastModule.forRoot({
        maxOpened: 5,
        autoDismiss: true,
        closeButton: true,
      }),
    ),
    ...servicesProviders,
  ],
}).catch((e: unknown) => {
  // Without this, a rejected APP_INITIALIZER leaves an empty window with nothing written to the
  // log and no indication of what went wrong. Surface the failure in both places instead.
  const message = e instanceof Error ? (e.stack ?? e.message) : String(e);
  ipc.log.write(LogLevelType.Error, `Failed to bootstrap the application: ${message}`);

  const el = window.document.body;
  if (el != null) {
    el.textContent =
      "Directory Connector failed to start. Please check the application logs for details.";
  }
});
