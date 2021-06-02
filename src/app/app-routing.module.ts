import { NgModule } from '@angular/core';
import {
    RouterModule,
    Routes,
} from '@angular/router';

import { AuthGuardService } from './services/auth-guard.service';
import { LaunchGuardService } from './services/launch-guard.service';

import { ApiKeyComponent } from './accounts/apiKey.component';
import { DashboardComponent } from './tabs/dashboard.component';
import { MoreComponent } from './tabs/more.component';
import { SettingsComponent } from './tabs/settings.component';
import { TabsComponent } from './tabs/tabs.component';

const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    {
        path: 'login',
        component: ApiKeyComponent,
        canActivate: [LaunchGuardService],
    },
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
