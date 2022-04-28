export class CipherBulkDeleteRequest {
  ids: string[];
  organizationId: string;

  constructor(ids: string[], organizationId?: string) {
    this.ids = ids == null ? [] : ids;
    this.organizationId = organizationId;
  }
}
