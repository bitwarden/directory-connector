import { BaseResponse } from "./baseResponse";
import { SelectionReadOnlyResponse } from "./selectionReadOnlyResponse";

export class CollectionResponse extends BaseResponse {
  id: string;
  organizationId: string;
  name: string;
  externalId: string;

  constructor(response: any) {
    super(response);
    this.id = this.getResponseProperty("Id");
    this.organizationId = this.getResponseProperty("OrganizationId");
    this.name = this.getResponseProperty("Name");
    this.externalId = this.getResponseProperty("ExternalId");
  }
}

export class CollectionDetailsResponse extends CollectionResponse {
  readOnly: boolean;

  constructor(response: any) {
    super(response);
    this.readOnly = this.getResponseProperty("ReadOnly") || false;
  }
}

export class CollectionGroupDetailsResponse extends CollectionResponse {
  groups: SelectionReadOnlyResponse[] = [];

  constructor(response: any) {
    super(response);
    const groups = this.getResponseProperty("Groups");
    if (groups != null) {
      this.groups = groups.map((g: any) => new SelectionReadOnlyResponse(g));
    }
  }
}
