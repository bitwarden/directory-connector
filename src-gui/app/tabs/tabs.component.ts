import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";

import { I18nPipe } from "@/src-gui/angular/pipes/i18n.pipe";

@Component({
  selector: "app-tabs",
  templateUrl: "tabs.component.html",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, I18nPipe],
})
export class TabsComponent {}
