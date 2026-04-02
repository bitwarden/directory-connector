import "zone.js";

import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { BitwardenToastModule } from "@/src-gui/angular/components/toastr.component";
import { A11yTitleDirective } from "@/src-gui/angular/directives/a11y-title.directive";
import { ApiActionDirective } from "@/src-gui/angular/directives/api-action.directive";
import { AutofocusDirective } from "@/src-gui/angular/directives/autofocus.directive";
import { BlurClickDirective } from "@/src-gui/angular/directives/blur-click.directive";
import { BoxRowDirective } from "@/src-gui/angular/directives/box-row.directive";
import { FallbackSrcDirective } from "@/src-gui/angular/directives/fallback-src.directive";
import { StopClickDirective } from "@/src-gui/angular/directives/stop-click.directive";
import { StopPropDirective } from "@/src-gui/angular/directives/stop-prop.directive";
import { I18nPipe } from "@/src-gui/angular/pipes/i18n.pipe";
import { ServicesModule } from "@/src-gui/app/services/services.module";

import { ApiKeyComponent } from "./accounts/apiKey.component";
import { EnvironmentComponent } from "./accounts/environment.component";
import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
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
    DashboardComponent,
    EnvironmentComponent,
    FallbackSrcDirective,
    I18nPipe,
    MoreComponent,
    SettingsComponent,
    StopClickDirective,
    StopPropDirective,
    TabsComponent,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
