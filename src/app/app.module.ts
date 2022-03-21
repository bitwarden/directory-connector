import "core-js/stable";
import "zone.js/dist/zone";

import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { JslibModule } from "jslib-angular/jslib.module";

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
    AppRoutingModule,
    BrowserAnimationsModule,
    BrowserModule,
    FormsModule,
    JslibModule,
    ServicesModule,
  ],
  declarations: [
    ApiKeyComponent,
    AppComponent,
    DashboardComponent,
    EnvironmentComponent,
    MoreComponent,
    SettingsComponent,
    TabsComponent,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
