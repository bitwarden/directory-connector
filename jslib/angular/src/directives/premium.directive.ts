import { Directive, OnInit, TemplateRef, ViewContainerRef } from "@angular/core";

import { StateService } from "jslib-common/abstractions/state.service";

/**
 * Only shows the element if the user has premium.
 */
@Directive({
  selector: "[appPremium]",
})
export class PremiumDirective implements OnInit {
  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private stateService: StateService
  ) {}

  async ngOnInit(): Promise<void> {
    const premium = await this.stateService.getCanAccessPremium();

    if (premium) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
