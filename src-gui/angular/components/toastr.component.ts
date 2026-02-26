import { CommonModule } from "@angular/common";
import { Component, ModuleWithProviders, NgModule } from "@angular/core";
import { DefaultNoComponentGlobalConfig, GlobalConfig, Toast, TOAST_CONFIG } from "ngx-toastr";

@Component({
  selector: "[toast-component2]",
  template: `
    @if (options().closeButton) {
      <button (click)="remove()" type="button" class="toast-close-button" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    }
    <div class="icon">
      <i></i>
    </div>
    <div>
      @if (title()) {
        <div [class]="options().titleClass" [attr.aria-label]="title()">
          {{ title() }}
          @if (duplicatesCount) {
            [{{ duplicatesCount + 1 }}]
          }
        </div>
      }
      @if (message() && options().enableHtml) {
        <div
          role="alertdialog"
          aria-live="polite"
          [class]="options().messageClass"
          [innerHTML]="message()"
        ></div>
      }
      @if (message() && !options().enableHtml) {
        <div
          role="alertdialog"
          aria-live="polite"
          [class]="options().messageClass"
          [attr.aria-label]="message()"
        >
          {{ message() }}
        </div>
      }
    </div>
    @if (options().progressBar) {
      <div>
        <div class="toast-progress" [style.width]="width + '%'"></div>
      </div>
    }
  `,
  styles: `
    :host {
      &.toast-in {
        animation: toast-animation var(--animation-duration) var(--animation-easing);
      }

      &.toast-out {
        animation: toast-animation var(--animation-duration) var(--animation-easing) reverse
          forwards;
      }
    }

    @keyframes toast-animation {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  `,
  preserveWhitespaces: false,
  standalone: false,
})
export class BitwardenToast extends Toast {}

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
