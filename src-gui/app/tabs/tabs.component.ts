import { NgClass } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { filter, map } from "rxjs";

import { I18nPipe } from "@/src-gui/angular/pipes/i18n.pipe";

@Component({
  selector: "app-tabs",
  templateUrl: "tabs.component.html",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, RouterLink, RouterLinkActive, RouterOutlet, I18nPipe],
})
export class TabsComponent {
  private router = inject(Router);

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
}
