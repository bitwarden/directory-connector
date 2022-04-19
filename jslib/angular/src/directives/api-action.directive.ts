import { Directive, ElementRef, Input, OnChanges } from "@angular/core";

import { LogService } from "jslib-common/abstractions/log.service";
import { ErrorResponse } from "jslib-common/models/response/errorResponse";

import { ValidationService } from "../services/validation.service";

/**
 * Provides error handling, in particular for any error returned by the server in an api call.
 * Attach it to a <form> element and provide the name of the class property that will hold the api call promise.
 * e.g. <form [appApiAction]="this.formPromise">
 * Any errors/rejections that occur will be intercepted and displayed as error toasts.
 */
@Directive({
  selector: "[appApiAction]",
})
export class ApiActionDirective implements OnChanges {
  @Input() appApiAction: Promise<any>;

  constructor(
    private el: ElementRef,
    private validationService: ValidationService,
    private logService: LogService
  ) {}

  ngOnChanges(changes: any) {
    if (this.appApiAction == null || this.appApiAction.then == null) {
      return;
    }

    this.el.nativeElement.loading = true;

    this.appApiAction.then(
      (response: any) => {
        this.el.nativeElement.loading = false;
      },
      (e: any) => {
        this.el.nativeElement.loading = false;

        if ((e as ErrorResponse).captchaRequired) {
          this.logService.error("Captcha required error response: " + e.getSingleMessage());
          return;
        }
        this.logService?.error(`Received API exception: ${e}`);
        this.validationService.showError(e);
      }
    );
  }
}
