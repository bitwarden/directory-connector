import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  ViewContainerRef,
  inject,
} from "@angular/core";
import { Router, RouterOutlet } from "@angular/router";

import { ToastModule, ToastService } from "@bitwarden/components";

import { BroadcasterService } from "@/libs/abstractions/broadcaster.service";
import { I18nService } from "@/libs/abstractions/i18n.service";
import { LogService } from "@/libs/abstractions/log.service";
import { MessagingService } from "@/libs/abstractions/messaging.service";
import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { StateService } from "@/libs/abstractions/state.service";

import { RendererAuthService } from "@/src-gui/services/electron/rendererAuth.service";
import { RendererSyncService } from "@/src-gui/services/electron/rendererSync.service";

const BroadcasterSubscriptionId = "AppComponent";

@Component({
  selector: "app-root",
  styles: [],
  template: ` <ng-template #settings></ng-template>
    <router-outlet></router-outlet>
    <bit-toast-container></bit-toast-container>`,
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ToastModule],
})
export class AppComponent implements OnInit {
  @ViewChild("settings", { read: ViewContainerRef, static: true }) settingsRef: ViewContainerRef;

  private broadcasterService = inject(BroadcasterService);
  private authService = inject(RendererAuthService);
  private syncService = inject(RendererSyncService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private i18nService = inject(I18nService);
  private platformUtilsService = inject(PlatformUtilsService);
  private messagingService = inject(MessagingService);
  private stateService = inject(StateService);
  private logService = inject(LogService);

  ngOnInit() {
    this.broadcasterService.subscribe(BroadcasterSubscriptionId, async (message: any) => {
      switch (message.command) {
        case "syncScheduleStarted":
        case "syncScheduleStopped":
          this.stateService.setSyncingDir(message.command === "syncScheduleStarted");
          break;
        case "logout":
          this.logOut(!!message.expired);
          break;
        case "checkDirSync":
          try {
            const syncConfig = await this.stateService.getSync();
            if (syncConfig.interval == null || syncConfig.interval < 5) {
              return;
            }

            const syncInterval = syncConfig.interval * 60000;
            const lastGroupSync = await this.stateService.getLastGroupSync();
            const lastUserSync = await this.stateService.getLastUserSync();
            let lastSync: Date = null;
            if (lastGroupSync != null && lastUserSync == null) {
              lastSync = lastGroupSync;
            } else if (lastGroupSync == null && lastUserSync != null) {
              lastSync = lastUserSync;
            } else if (lastGroupSync != null && lastUserSync != null) {
              if (lastGroupSync.getTime() < lastUserSync.getTime()) {
                lastSync = lastGroupSync;
              } else {
                lastSync = lastUserSync;
              }
            }

            let lastSyncAgo = syncInterval + 1;
            if (lastSync != null) {
              lastSyncAgo = new Date().getTime() - lastSync.getTime();
            }

            if (lastSyncAgo >= syncInterval) {
              await this.syncService.run(false, false);
            }
          } catch (e) {
            this.logService.error(e);
          }

          this.messagingService.send("scheduleNextDirSync");
          break;
        case "showToast":
          this.showToast(message);
          break;
        case "ssoCallback":
          this.router.navigate(["sso"], {
            queryParams: { code: message.code, state: message.state },
          });
          break;
        default:
      }
    });
  }

  ngOnDestroy() {
    this.broadcasterService.unsubscribe(BroadcasterSubscriptionId);
  }

  private async logOut(expired: boolean) {
    await this.authService.logOut();
    if (expired) {
      this.platformUtilsService.showToast(
        "warning",
        this.i18nService.t("loggedOut"),
        this.i18nService.t("loginExpired"),
      );
    }
    this.router.navigate(["login"]);
  }

  private showToast(msg: any) {
    this.toastService.showToast({
      variant: msg.type,
      title: msg.title,
      message: msg.text,
      timeout: msg.options?.timeout,
    });
  }
}
