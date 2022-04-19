import { Directive, OnInit, TemplateRef, ViewContainerRef } from "@angular/core";

import { StateService } from "jslib-common/abstractions/state.service";

/**
 * Hides the element if the user has premium.
 */
@Directive({
  selector: "[appNotPremium]",
})
export class NotPremiumDirective implements OnInit {
  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private stateService: StateService
  ) {}

  async ngOnInit(): Promise<void> {
    const premium = await this.stateService.getCanAccessPremium();

    if (premium) {
      this.viewContainer.clear();
    } else {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
