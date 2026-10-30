import { animate, state, style, transition, trigger } from "@angular/animations";
import { Component } from "@angular/core";
import { Toast as BaseToastrComponent } from "ngx-toastr";

import { ToastComponent } from "./toast.component";

/**
 * Toasts are ephemeral notifications. They most often communicate the result of a user action. Due to their ephemeral nature, long messages and critical alerts should not utilize toasts.
 */
// FIXME(https://bitwarden.atlassian.net/browse/CL-764): Migrate to OnPush
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
@Component({
  template: `
    <bit-toast
      [title]="options()?.payload?.title"
      [variant]="options()?.payload?.variant"
      [message]="options()?.payload?.message"
      [progressWidth]="width()"
      (onClose)="remove()"
    ></bit-toast>
  `,
  animations: [
    trigger("flyInOut", [
      state("inactive", style({ opacity: 0 })),
      state("active", style({ opacity: 1 })),
      state("removed", style({ opacity: 0 })),
      transition("inactive => active", animate("{{ easeTime }}ms {{ easing }}")),
      transition("active => removed", animate("{{ easeTime }}ms {{ easing }}")),
    ]),
  ],
  imports: [ToastComponent],
})
export class BitwardenToastrComponent extends BaseToastrComponent<{
  title?: ReturnType<ToastComponent["title"]>;
  variant?: ReturnType<ToastComponent["variant"]>;
  message: ReturnType<ToastComponent["message"]>;
}> {}
