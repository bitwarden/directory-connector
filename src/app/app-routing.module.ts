import { NgModule } from "@angular/core";
import { RouterModule, Routes, mapToCanActivate } from "@angular/router";

import { ApiKeyComponent } from "./accounts/apiKey.component";
import { AuthGuardService } from "./services/auth-guard.service";
import { LaunchGuardService } from "./services/launch-guard.service";
import { DashboardComponent } from "./tabs/dashboard.component";
import { MoreComponent } from "./tabs/more.component";
import { SettingsComponent } from "./tabs/settings.component";
import { TabsComponent } from "./tabs/tabs.component";

const routes: Routes = [
  { path: "", redirectTo: "/login", pathMatch: "full" },
  {
    path: "login",
    component: ApiKeyComponent,
    canActivate: mapToCanActivate([LaunchGuardService]),
  },
  {
    path: "tabs",
    component: TabsComponent,
    children: [
      {
        path: "",
        redirectTo: "/tabs/dashboard",
        pathMatch: "full",
      },
      {
        path: "dashboard",
        component: DashboardComponent,
        canActivate: mapToCanActivate([AuthGuardService]),
      },
      {
        path: "settings",
        component: SettingsComponent,
        canActivate: mapToCanActivate([AuthGuardService]),
      },
      {
        path: "more",
        component: MoreComponent,
        canActivate: mapToCanActivate([AuthGuardService]),
      },
    ],
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: true,
      /*enableTracing: true,*/
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
