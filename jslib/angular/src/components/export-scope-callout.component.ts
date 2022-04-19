import { Component, Input, OnInit } from "@angular/core";

import { OrganizationService } from "jslib-common/abstractions/organization.service";
import { StateService } from "jslib-common/abstractions/state.service";

@Component({
  selector: "app-export-scope-callout",
  templateUrl: "export-scope-callout.component.html",
})
export class ExportScopeCalloutComponent implements OnInit {
  @Input() organizationId: string = null;

  show = false;
  scopeConfig: {
    title: string;
    description: string;
    scopeIdentifier: string;
  };

  constructor(
    protected organizationService: OrganizationService,
    protected stateService: StateService
  ) {}

  async ngOnInit(): Promise<void> {
    if (!(await this.organizationService.hasOrganizations())) {
      return;
    }
    this.scopeConfig =
      this.organizationId != null
        ? {
            title: "exportingOrganizationVaultTitle",
            description: "exportingOrganizationVaultDescription",
            scopeIdentifier: (await this.organizationService.get(this.organizationId)).name,
          }
        : {
            title: "exportingPersonalVaultTitle",
            description: "exportingPersonalVaultDescription",
            scopeIdentifier: await this.stateService.getEmail(),
          };
    this.show = true;
  }
}
