import { Directive, ElementRef, Input, afterNextRender, inject } from "@angular/core";

import { Utils } from "@/libs/utils/utils";

@Directive({
  selector: "[appAutofocus]",
  standalone: true,
})
export class AutofocusDirective {
  @Input() set appAutofocus(condition: boolean | string) {
    this.autofocus = condition === "" || condition === true;
  }

  private autofocus: boolean;
  private el = inject(ElementRef);

  constructor() {
    afterNextRender(() => {
      if (!Utils.isMobileBrowser && this.autofocus) {
        this.el.nativeElement.focus();
      }
    });
  }
}
