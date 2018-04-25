import { NgModule } from '@angular/core';
import {
    RouterModule,
    Routes,
} from '@angular/router';

import { AuthGuardService } from './services/auth-guard.service';
import { LaunchGuardService } from './services/launch-guard.service';

import { LoginComponent } from './accounts/login.component';
import { TwoFactorComponent } from './accounts/two-factor.component';
import { DashboardComponent } from './dashboard/dashboard.component';

const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    {
        path: 'login',
        component: LoginComponent,
        canActivate: [LaunchGuardService],
    },
    { path: '2fa', component: TwoFactorComponent },
    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [AuthGuardService],
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
