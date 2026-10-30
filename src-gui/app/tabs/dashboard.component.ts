import { DatePipe, DecimalPipe, NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";

import {
  BadgeModule,
  ButtonModule,
  CardComponent,
  CalloutModule,
  CheckboxModule,
  FormControlModule,
  FormFieldModule,
  IconTileComponent,
  SectionComponent,
  SectionHeaderComponent,
  TypographyModule,
} from "@bitwarden/components";

import { BroadcasterService } from "@/libs/abstractions/broadcaster.service";
import { I18nService } from "@/libs/abstractions/i18n.service";
import { MessagingService } from "@/libs/abstractions/messaging.service";
import { PlatformUtilsService } from "@/libs/abstractions/platformUtils.service";
import { StateService } from "@/libs/abstractions/state.service";
import { GroupEntry } from "@/libs/models/groupEntry";
import { SyncHistoryEntry } from "@/libs/models/syncHistoryEntry";
import { SyncPreview } from "@/libs/models/syncPreview";
import { UserEntry } from "@/libs/models/userEntry";
import { ConnectorUtils } from "@/libs/utils";

import { ApiActionDirective } from "@/src-gui/angular/directives/api-action.directive";
import { I18nPipe } from "@/src-gui/angular/pipes/i18n.pipe";
import { downloadFile, toCsv } from "@/src-gui/angular/utils/csv";
import { RendererSyncService } from "@/src-gui/services/electron/rendererSync.service";

type SyncResult = Awaited<ReturnType<RendererSyncService["run"]>>;

const BroadcasterSubscriptionId = "DashboardComponent";

@Component({
  selector: "app-dashboard",
  templateUrl: "dashboard.component.html",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ApiActionDirective,
    BadgeModule,
    ButtonModule,
    CardComponent,
    CalloutModule,
    CheckboxModule,
    DatePipe,
    DecimalPipe,
    FormControlModule,
    FormFieldModule,
    FormsModule,
    I18nPipe,
    IconTileComponent,
    NgTemplateOutlet,
    SectionComponent,
    SectionHeaderComponent,
    TypographyModule,
  ],
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

  simSearch = signal("");
  readonly filteredEnabledUsers = computed(() => this.filterUsers(this.simEnabledUsers()));
  readonly filteredDisabledUsers = computed(() => this.filterUsers(this.simDisabledUsers()));
  readonly filteredDeletedUsers = computed(() => this.filterUsers(this.simDeletedUsers()));
  readonly filteredGroups = computed(() => {
    const query = this.simSearch().trim().toLowerCase();
    const groups = this.simGroups() ?? [];
    return query === ""
      ? groups
      : groups.filter(
          (g) =>
            matches(g.displayName, query) ||
            matches(g.referenceId, query) ||
            g.users?.some((u) => matches(u.displayName, query)),
        );
  });

  previewPromise = signal<Promise<SyncPreview>>(null);
  preview = signal<SyncPreview>(null);
  readonly previewHasChanges = computed(() => {
    const p = this.preview();
    return (
      p != null &&
      p.usersToAdd.length +
        p.usersToLink.length +
        p.usersToRemove.length +
        p.groupsToCreate.length +
        p.groupsToUpdate.length >
        0
    );
  });

  readonly historyPreviewCount = 10;
  history = signal<SyncHistoryEntry[]>([]);
  showAllHistory = signal(false);
  readonly visibleHistory = computed(() =>
    this.showAllHistory() ? this.history() : this.history().slice(0, this.historyPreviewCount),
  );

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
          await this.loadHistory();
          break;
        default:
          break;
      }
    });

    this.syncRunning.set(!!(await this.stateService.getSyncingDir()));
    await this.updateLastSync();
    await this.loadHistory();
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

  async runPreview() {
    this.preview.set(null);
    const promise = this.syncService.preview();
    this.previewPromise.set(promise);
    try {
      this.preview.set(await promise);
    } catch {
      // appApiAction shows the error to the user.
    }
  }

  exportCsv() {
    const status = (u: UserEntry) => (u.deleted ? "deleted" : u.disabled ? "disabled" : "enabled");
    const rows: (string | number)[][] = [["Type", "Name", "External ID", "Status", "Members"]];
    for (const u of this.simUsers() ?? []) {
      rows.push(["user", u.displayName, u.externalId, status(u), ""]);
    }
    for (const g of this.simGroups() ?? []) {
      rows.push([
        "group",
        g.displayName,
        g.externalId,
        "",
        (g.users ?? []).map((u) => u.displayName).join("; "),
      ]);
    }
    const date = new Date().toISOString().slice(0, 10);
    downloadFile(`directory-connector-test-${date}.csv`, toCsv(rows), "text/csv;charset=utf-8");
  }

  private filterUsers(users: UserEntry[]): UserEntry[] {
    const query = this.simSearch().trim().toLowerCase();
    return query === ""
      ? users
      : users.filter((u) => matches(u.displayName, query) || matches(u.referenceId, query));
  }

  private async loadHistory() {
    this.history.set(await this.stateService.getSyncHistory());
  }

  private async updateLastSync() {
    this.lastGroupSync.set(await this.stateService.getLastGroupSync());
    this.lastUserSync.set(await this.stateService.getLastUserSync());
  }
}

function matches(value: string | null | undefined, query: string): boolean {
  return value?.toLowerCase().includes(query) ?? false;
}
