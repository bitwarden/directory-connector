import "core-js/stable";
import "zone.js";

import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { CalloutComponent } from "jslib-angular/components/callout.component";
import { IconComponent } from "jslib-angular/components/icon.component";
import { BitwardenToastModule } from "jslib-angular/components/toastr.component";
import { A11yTitleDirective } from "jslib-angular/directives/a11y-title.directive";
import { ApiActionDirective } from "jslib-angular/directives/api-action.directive";
import { AutofocusDirective } from "jslib-angular/directives/autofocus.directive";
import { BlurClickDirective } from "jslib-angular/directives/blur-click.directive";
import { BoxRowDirective } from "jslib-angular/directives/box-row.directive";
import { FallbackSrcDirective } from "jslib-angular/directives/fallback-src.directive";
import { StopClickDirective } from "jslib-angular/directives/stop-click.directive";
import { StopPropDirective } from "jslib-angular/directives/stop-prop.directive";
import { I18nPipe } from "jslib-angular/pipes/i18n.pipe";
import { SearchCiphersPipe } from "jslib-angular/pipes/search-ciphers.pipe";

import { ApiKeyComponent } from "./accounts/apiKey.component";
import { EnvironmentComponent } from "./accounts/environment.component";
import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { ServicesModule } from "./services/services.module";
import { DashboardComponent } from "./tabs/dashboard.component";
import { MoreComponent } from "./tabs/more.component";
import { SettingsComponent } from "./tabs/settings.component";
import { TabsComponent } from "./tabs/tabs.component";

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    AppRoutingModule,
    ServicesModule,
    BitwardenToastModule.forRoot({
      maxOpened: 5,
      autoDismiss: true,
      closeButton: true,
    }),
  ],
  declarations: [
    A11yTitleDirective,
    ApiActionDirective,
    ApiKeyComponent,
    AppComponent,
    AutofocusDirective,
    BlurClickDirective,
    BoxRowDirective,
    CalloutComponent,
    DashboardComponent,
    EnvironmentComponent,
    FallbackSrcDirective,
    I18nPipe,
    IconComponent,
    MoreComponent,
    SearchCiphersPipe,
    SettingsComponent,
    StopClickDirective,
    StopPropDirective,
    TabsComponent,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
