import 'core-js';
import 'zone.js/dist/zone';

import { ToasterModule } from 'angular2-toaster';

import { AppRoutingModule } from './app-routing.module';
import { ServicesModule } from './services/services.module';

import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';

import { CalloutComponent } from 'jslib/angular/components/callout.component';
import { IconComponent } from 'jslib/angular/components/icon.component';
import { ModalComponent } from 'jslib/angular/components/modal.component';

import { EnvironmentComponent } from './accounts/environment.component';
import { LoginComponent } from './accounts/login.component';
import { SsoComponent } from './accounts/sso.component';
import { TwoFactorOptionsComponent } from './accounts/two-factor-options.component';
import { TwoFactorComponent } from './accounts/two-factor.component';
import { DashboardComponent } from './tabs/dashboard.component';
import { MoreComponent } from './tabs/more.component';
import { SettingsComponent } from './tabs/settings.component';
import { TabsComponent } from './tabs/tabs.component';

import { A11yTitleDirective } from 'jslib/angular/directives/a11y-title.directive';
import { ApiActionDirective } from 'jslib/angular/directives/api-action.directive';
import { AutofocusDirective } from 'jslib/angular/directives/autofocus.directive';
import { BlurClickDirective } from 'jslib/angular/directives/blur-click.directive';
import { BoxRowDirective } from 'jslib/angular/directives/box-row.directive';
import { FallbackSrcDirective } from 'jslib/angular/directives/fallback-src.directive';
import { StopClickDirective } from 'jslib/angular/directives/stop-click.directive';
import { StopPropDirective } from 'jslib/angular/directives/stop-prop.directive';

import { I18nPipe } from 'jslib/angular/pipes/i18n.pipe';
import { SearchCiphersPipe } from 'jslib/angular/pipes/search-ciphers.pipe';

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        AppRoutingModule,
        ServicesModule,
        ToasterModule.forRoot(),
    ],
    declarations: [
        A11yTitleDirective,
        ApiActionDirective,
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
        LoginComponent,
        ModalComponent,
        MoreComponent,
        SearchCiphersPipe,
        SettingsComponent,
        SsoComponent,
        StopClickDirective,
        StopPropDirective,
        TabsComponent,
        TwoFactorComponent,
        TwoFactorOptionsComponent,
    ],
    entryComponents: [
        EnvironmentComponent,
        ModalComponent,
        TwoFactorOptionsComponent,
    ],
    providers: [],
    bootstrap: [AppComponent],
})
export class AppModule { }
