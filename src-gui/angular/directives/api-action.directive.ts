import { Directive, Input, OnChanges, inject, signal } from "@angular/core";

import { LogService } from "@/libs/abstractions/log.service";
import { ErrorResponse } from "@/libs/models/response/errorResponse";

import { ValidationService } from "@/src-gui/angular/services/validation.service";
import { unwrapIpcError } from "@/src-gui/angular/utils/unwrap-ipc-error";

/**
 * Provides error handling, in particular for any error returned by the server in an api call.
 * Attach it to a <form> element and provide the name of the class property that will hold the api call promise.
 * e.g. <form [appApiAction]="this.formPromise" #form="appApiAction">
 * Any errors/rejections that occur will be intercepted and displayed as error toasts. Exposes a
 * `loading` signal (via `#form="appApiAction"`) rather than a plain DOM property, since in a
 * zoneless app nothing else would tell Angular to re-render the template after the promise settles.
 */
@Directive({
  selector: "[appApiAction]",
  standalone: true,
  exportAs: "appApiAction",
})
export class ApiActionDirective implements OnChanges {
  @Input() appApiAction: Promise<any>;

  private validationService = inject(ValidationService);
  private logService = inject(LogService);

  loading = signal(false);

  ngOnChanges(changes: any) {
    if (this.appApiAction == null || this.appApiAction.then == null) {
      return;
    }

    this.loading.set(true);

    this.appApiAction.then(
      (response: any) => {
        this.loading.set(false);
      },
      (e: any) => {
        this.loading.set(false);
        e = unwrapIpcError(e);

        if ((e as ErrorResponse).captchaRequired) {
          this.logService.error("Captcha required error response: " + e.getSingleMessage());
          return;
        }
        this.logService?.error(`Received API exception: ${e.message ?? e}`);
        this.validationService.showError(e);
      },
    );
  }
}
