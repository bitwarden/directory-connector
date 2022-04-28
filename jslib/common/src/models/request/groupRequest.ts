import { SelectionReadOnlyRequest } from "./selectionReadOnlyRequest";

export class GroupRequest {
  name: string;
  accessAll: boolean;
  externalId: string;
  collections: SelectionReadOnlyRequest[] = [];
}
