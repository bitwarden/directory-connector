import { NgClass } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";

import { I18nPipe } from "@/src-gui/angular/pipes/i18n.pipe";

@Component({
  selector: "app-tabs",
  templateUrl: "tabs.component.html",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, RouterLink, RouterLinkActive, RouterOutlet, I18nPipe],
})
export class TabsComponent {
  readonly navItems = [
    { path: "dashboard", label: "dashboard", icon: "bwi-dashboard" },
    { path: "settings", label: "settings", icon: "bwi-sliders" },
    { path: "more", label: "more", icon: "bwi-ellipsis-h" },
  ];
}
