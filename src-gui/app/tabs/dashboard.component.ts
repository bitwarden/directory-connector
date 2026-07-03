import { DatePipe } from "@angular/common";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";

import { BroadcasterService } from "@/libs/abstractions/broadcaster.service";
import { I18nService } from "@/libs/abstractions/i18n.service";
import { MessagingService } from "@/libs/abstractions/messaging.service";
import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { StateService } from "@/libs/abstractions/state.service";
import { GroupEntry } from "@/libs/models/groupEntry";
import { SimResult } from "@/libs/models/simResult";
import { UserEntry } from "@/libs/models/userEntry";
import { SyncService } from "@/libs/services/sync.service";
import { ConnectorUtils } from "@/libs/utils";

import { ApiActionDirective } from "@/src-gui/angular/directives/api-action.directive";
import { I18nPipe } from "@/src-gui/angular/pipes/i18n.pipe";

const BroadcasterSubscriptionId = "DashboardComponent";

@Component({
  selector: "app-dashboard",
  templateUrl: "dashboard.component.html",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ApiActionDirective, DatePipe, FormsModule, I18nPipe],
})
export class DashboardComponent implements OnInit, OnDestroy {
  simGroups = signal<GroupEntry[]>(null);
  simUsers = signal<UserEntry[]>(null);
  simEnabledUsers = signal<UserEntry[]>([]);
  simDisabledUsers = signal<UserEntry[]>([]);
  simDeletedUsers = signal<UserEntry[]>([]);
  simPromise = signal<Promise<SimResult>>(null);
  simSinceLast = signal(false);
  syncPromise = signal<Promise<[GroupEntry[], UserEntry[]]>>(null);
  startPromise = signal<Promise<any>>(null);
  lastGroupSync = signal<Date>(null);
  lastUserSync = signal<Date>(null);
  syncRunning = signal(false);

  private cdr = inject(ChangeDetectorRef);
  private i18nService = inject(I18nService);
  private syncService = inject(SyncService);
  private broadcasterService = inject(BroadcasterService);
  private messagingService = inject(MessagingService);
  private platformUtilsService = inject(PlatformUtilsService);
  private stateService = inject(StateService);

  async ngOnInit() {
    this.broadcasterService.subscribe(BroadcasterSubscriptionId, async (message: any) => {
      switch (message.command) {
        case "dirSyncCompleted":
          await this.updateLastSync();
          break;
        default:
          break;
      }
    });

    this.syncRunning.set(!!(await this.stateService.getSyncingDir()));
    await this.updateLastSync();
  }

  async ngOnDestroy() {
    this.broadcasterService.unsubscribe(BroadcasterSubscriptionId);
  }

  async start() {
    const promise = this.syncService.sync(false, false);
    this.startPromise.set(promise);
    await promise;
    this.messagingService.send("scheduleNextDirSync");
    this.syncRunning.set(true);
    this.platformUtilsService.showToast("success", null, this.i18nService.t("syncingStarted"));
  }

  async stop() {
    this.messagingService.send("cancelDirSync");
    this.syncRunning.set(false);
    this.platformUtilsService.showToast("success", null, this.i18nService.t("syncingStopped"));
  }

  async sync() {
    const promise = this.syncService.sync(false, false);
    this.syncPromise.set(promise);
    const result = await promise;
    const groupCount = result[0] != null ? result[0].length : 0;
    const userCount = result[1] != null ? result[1].length : 0;
    this.platformUtilsService.showToast(
      "success",
      null,
      this.i18nService.t("syncCounts", groupCount.toString(), userCount.toString()),
    );
  }

  async simulate() {
    this.simGroups.set([]);
    this.simUsers.set([]);
    this.simEnabledUsers.set([]);
    this.simDisabledUsers.set([]);
    this.simDeletedUsers.set([]);

    try {
      const promise = ConnectorUtils.simulate(
        this.syncService,
        this.i18nService,
        this.simSinceLast(),
      );
      this.simPromise.set(promise);
      const result = await promise;
      this.simGroups.set(result.groups);
      this.simUsers.set(result.users);
      this.simEnabledUsers.set(result.enabledUsers);
      this.simDisabledUsers.set(result.disabledUsers);
      this.simDeletedUsers.set(result.deletedUsers);
    } catch {
      this.simGroups.set(null);
      this.simUsers.set(null);
    } finally {
      this.cdr.markForCheck();
    }
  }

  private async updateLastSync() {
    this.lastGroupSync.set(await this.stateService.getLastGroupSync());
    this.lastUserSync.set(await this.stateService.getLastUserSync());
  }
}
