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
import { UserEntry } from "@/libs/models/userEntry";
import { ConnectorUtils } from "@/libs/utils";

import { ApiActionDirective } from "@/src-gui/angular/directives/api-action.directive";
import { I18nPipe } from "@/src-gui/angular/pipes/i18n.pipe";
import { RendererSyncService } from "@/src-gui/services/electron/rendererSync.service";

type SyncResult = Awaited<ReturnType<RendererSyncService["run"]>>;

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
  simPromise = signal<Promise<SyncResult>>(null);
  simSinceLast = signal(false);
  syncPromise = signal<Promise<SyncResult>>(null);
  startPromise = signal<Promise<any>>(null);
  lastGroupSync = signal<Date>(null);
  lastUserSync = signal<Date>(null);
  syncRunning = signal(false);

  private cdr = inject(ChangeDetectorRef);
  private syncService = inject(RendererSyncService);
  private i18nService = inject(I18nService);
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
    const promise = this.syncService.run(false, false);
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
    const promise = this.syncService.run(false, false);
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
      const promise = this.syncService.run(!this.simSinceLast(), true);
      this.simPromise.set(promise);
      const [rawGroups, rawUsers]: SyncResult = await promise;
      const groups = rawGroups?.map((g) => GroupEntry.fromJSON(g)) ?? [];
      const users = rawUsers?.map((u) => UserEntry.fromJSON(u)) ?? [];
      const simResult = ConnectorUtils.buildSimResult(groups, users, this.i18nService);
      this.simGroups.set(simResult.groups);
      this.simUsers.set(simResult.users);
      this.simEnabledUsers.set(simResult.enabledUsers);
      this.simDisabledUsers.set(simResult.disabledUsers);
      this.simDeletedUsers.set(simResult.deletedUsers);
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
