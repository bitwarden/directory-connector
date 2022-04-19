import { animate, state, style, transition, trigger } from "@angular/animations";
import { CommonModule } from "@angular/common";
import { Component, ModuleWithProviders, NgModule } from "@angular/core";
import {
  DefaultNoComponentGlobalConfig,
  GlobalConfig,
  Toast as BaseToast,
  ToastPackage,
  ToastrService,
  TOAST_CONFIG,
} from "ngx-toastr";

@Component({
  selector: "[toast-component2]",
  template: `
    <button
      *ngIf="options.closeButton"
      (click)="remove()"
      type="button"
      class="toast-close-button"
      aria-label="Close"
    >
      <span aria-hidden="true">&times;</span>
    </button>
    <div class="icon">
      <i></i>
    </div>
    <div>
      <div *ngIf="title" [class]="options.titleClass" [attr.aria-label]="title">
        {{ title }} <ng-container *ngIf="duplicatesCount">[{{ duplicatesCount + 1 }}]</ng-container>
      </div>
      <div
        *ngIf="message && options.enableHtml"
        role="alertdialog"
        aria-live="polite"
        [class]="options.messageClass"
        [innerHTML]="message"
      ></div>
      <div
        *ngIf="message && !options.enableHtml"
        role="alertdialog"
        aria-live="polite"
        [class]="options.messageClass"
        [attr.aria-label]="message"
      >
        {{ message }}
      </div>
    </div>
    <div *ngIf="options.progressBar">
      <div class="toast-progress" [style.width]="width + '%'"></div>
    </div>
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
  preserveWhitespaces: false,
})
export class BitwardenToast extends BaseToast {
  constructor(protected toastrService: ToastrService, public toastPackage: ToastPackage) {
    super(toastrService, toastPackage);
  }
}

export const BitwardenToastGlobalConfig: GlobalConfig = {
  ...DefaultNoComponentGlobalConfig,
  toastComponent: BitwardenToast,
};

@NgModule({
  imports: [CommonModule],
  declarations: [BitwardenToast],
  exports: [BitwardenToast],
})
export class BitwardenToastModule {
  static forRoot(config: Partial<GlobalConfig> = {}): ModuleWithProviders<BitwardenToastModule> {
    return {
      ngModule: BitwardenToastModule,
      providers: [
        {
          provide: TOAST_CONFIG,
          useValue: {
            default: BitwardenToastGlobalConfig,
            config: config,
          },
        },
      ],
    };
  }
}
