import { NgClass } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { filter, map } from "rxjs";

import { TypographyModule } from "@bitwarden/components";

import { StateService } from "@/libs/abstractions/state.service";

import { I18nPipe } from "@/src-gui/angular/pipes/i18n.pipe";
import { describeServer, ServerKind } from "@/src-gui/angular/utils/describe-server";

@Component({
  selector: "app-tabs",
  templateUrl: "tabs.component.html",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, RouterLink, RouterLinkActive, RouterOutlet, I18nPipe, TypographyModule],
})
export class TabsComponent {
  private router = inject(Router);
  private stateService = inject(StateService);

  /** Which org, server and profile a sync from this window affects. */
  readonly connection = signal<{
    serverKind: ServerKind;
    serverHost: string;
    profileName: string | null;
    organizationId: string | null;
  }>(null);

  readonly navItems = [
    { path: "dashboard", label: "dashboard", icon: "bwi-dashboard" },
    { path: "settings", label: "settings", icon: "bwi-sliders" },
    { path: "more", label: "more", icon: "bwi-ellipsis-h" },
  ];

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.split("/").pop()),
    ),
    { initialValue: this.router.url.split("/").pop() },
  );

  readonly pageTitle = computed(
    () => this.navItems.find((item) => item.path === this.currentPath())?.label ?? "dashboard",
  );

  constructor() {
    // Settings can switch the active profile, so refresh after every navigation.
    effect(() => {
      this.currentPath();
      void this.loadConnection();
    });
  }

  private async loadConnection() {
    const server = describeServer(await this.stateService.getApiUrl());
    const activeProfileId = await this.stateService.getActiveDirectoryProfileId();
    const profiles = await this.stateService.getDirectoryProfiles();
    this.connection.set({
      serverKind: server.kind,
      serverHost: server.host,
      profileName: profiles?.find((p) => p.id === activeProfileId)?.name ?? null,
      organizationId: await this.stateService.getOrganizationId(),
    });
  }
}
