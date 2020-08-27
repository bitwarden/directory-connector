import { NgModule } from '@angular/core';
import {
    RouterModule,
    Routes,
} from '@angular/router';

import { AuthGuardService } from './services/auth-guard.service';
import { LaunchGuardService } from './services/launch-guard.service';

import { LoginComponent } from './accounts/login.component';
import { SetPasswordComponent } from './accounts/set-password.component';
import { SsoComponent } from './accounts/sso.component';
import { TwoFactorComponent } from './accounts/two-factor.component';
import { DashboardComponent } from './tabs/dashboard.component';
import { MoreComponent } from './tabs/more.component';
import { SettingsComponent } from './tabs/settings.component';
import { TabsComponent } from './tabs/tabs.component';

const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    {
        path: 'login',
        component: LoginComponent,
        canActivate: [LaunchGuardService],
    },
    { path: '2fa', component: TwoFactorComponent },
    { path: 'sso', component: SsoComponent },
    {
        path: 'tabs',
        component: TabsComponent,
        children: [
            {
                path: '',
                redirectTo: '/tabs/dashboard',
                pathMatch: 'full',
            },
            {
                path: 'dashboard',
                component: DashboardComponent,
                canActivate: [AuthGuardService],
            },
            {
                path: 'settings',
                component: SettingsComponent,
                canActivate: [AuthGuardService],
            },
            {
                path: 'more',
                component: MoreComponent,
                canActivate: [AuthGuardService],
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, {
        useHash: true,
        /*enableTracing: true,*/
    })],
    exports: [RouterModule],
})
export class AppRoutingModule { }
