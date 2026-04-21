import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  SecurityContext,
  ViewChild,
  ViewContainerRef,
  inject,
} from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { Router, RouterOutlet } from "@angular/router";
import { IndividualConfig, ToastrService } from "ngx-toastr";

import { AuthService } from "@/libs/abstractions/auth.service";
import { BroadcasterService } from "@/libs/abstractions/broadcaster.service";
import { I18nService } from "@/libs/abstractions/i18n.service";
import { LogService } from "@/libs/abstractions/log.service";
import { MessagingService } from "@/libs/abstractions/messaging.service";
import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { StateService } from "@/libs/abstractions/state.service";
import { TokenService } from "@/libs/abstractions/token.service";
import { SyncService } from "@/libs/services/sync.service";

const BroadcasterSubscriptionId = "AppComponent";

@Component({
  selector: "app-root",
  styles: [],
  template: ` <ng-template #settings></ng-template>
    <router-outlet></router-outlet>`,
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
})
export class AppComponent implements OnInit {
  @ViewChild("settings", { read: ViewContainerRef, static: true }) settingsRef: ViewContainerRef;

  private broadcasterService = inject(BroadcasterService);
  private tokenService = inject(TokenService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastrService = inject(ToastrService);
  private i18nService = inject(I18nService);
  private sanitizer = inject(DomSanitizer);
  private platformUtilsService = inject(PlatformUtilsService);
  private messagingService = inject(MessagingService);
  private syncService = inject(SyncService);
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
              await this.syncService.sync(false, false);
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
    await this.stateService.clearAuthTokens();

    this.authService.logOut(async () => {
      if (expired) {
        this.platformUtilsService.showToast(
          "warning",
          this.i18nService.t("loggedOut"),
          this.i18nService.t("loginExpired"),
        );
      }
      this.router.navigate(["login"]);
    });
  }

  private showToast(msg: any) {
    let message = "";

    const options: Partial<IndividualConfig> = {};

    if (typeof msg.text === "string") {
      message = msg.text;
    } else if (msg.text.length === 1) {
      message = msg.text[0];
    } else {
      msg.text.forEach(
        (t: string) =>
          (message += "<p>" + this.sanitizer.sanitize(SecurityContext.HTML, t) + "</p>"),
      );
      options.enableHtml = true;
    }
    if (msg.options != null) {
      if (msg.options.trustedHtml === true) {
        options.enableHtml = true;
      }
      if (msg.options.timeout != null && msg.options.timeout > 0) {
        options.timeOut = msg.options.timeout;
      }
    }

    this.toastrService.show(message, msg.title, options, "toast-" + msg.type);
  }
}
