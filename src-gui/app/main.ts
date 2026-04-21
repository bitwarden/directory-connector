import { enableProdMode, importProvidersFrom, provideZonelessChangeDetection } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideRouter, withHashLocation } from "@angular/router";

import { BitwardenToastModule } from "@/src-gui/angular/components/toastr.component";
import { isDev } from "@/src-gui/utils";

import "../scss/styles.scss";

import { routes } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { servicesProviders } from "./services/services.module";

if (!isDev()) {
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
});
