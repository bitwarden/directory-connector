import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from "@angular/core";

import { BroadcasterService } from "@/libs/abstractions/broadcaster.service";
import { I18nService } from "@/libs/abstractions/i18n.service";
import { MessagingService } from "@/libs/abstractions/messaging.service";
import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { StateService } from "@/libs/abstractions/state.service";

import { I18nPipe } from "@/src-gui/angular/pipes/i18n.pipe";

const BroadcasterSubscriptionId = "MoreComponent";

@Component({
  selector: "app-more",
  templateUrl: "more.component.html",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [I18nPipe],
})
export class MoreComponent implements OnInit, OnDestroy {
  version = signal("");
  year = signal("");
  checkingForUpdate = signal(false);

  private platformUtilsService = inject(PlatformUtilsService);
  private i18nService = inject(I18nService);
  private messagingService = inject(MessagingService);
  private broadcasterService = inject(BroadcasterService);
  private stateService = inject(StateService);

  async ngOnInit() {
    this.broadcasterService.subscribe(BroadcasterSubscriptionId, async (message: any) => {
      switch (message.command) {
        case "checkingForUpdate":
          this.checkingForUpdate.set(true);
          break;
        case "doneCheckingForUpdate":
          this.checkingForUpdate.set(false);
          break;
        default:
          break;
      }
    });

    this.year.set(new Date().getFullYear().toString());
    this.version.set(await this.platformUtilsService.getApplicationVersion());
  }

  ngOnDestroy() {
    this.broadcasterService.unsubscribe(BroadcasterSubscriptionId);
  }

  update() {
    this.messagingService.send("checkForUpdate");
  }

  async logOut() {
    const confirmed = await this.platformUtilsService.showDialog(
      this.i18nService.t("logOutConfirmation"),
      this.i18nService.t("logOut"),
      this.i18nService.t("yes"),
      this.i18nService.t("cancel"),
    );
    if (confirmed) {
      this.messagingService.send("logout");
    }
  }

  async clearCache() {
    await this.stateService.clearSyncSettings(true);
    this.platformUtilsService.showToast("success", null, this.i18nService.t("syncCacheCleared"));
  }
}
