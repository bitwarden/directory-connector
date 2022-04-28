import { ImportResult } from "../models/domain/importResult";

export interface Importer {
  organizationId: string;
  parse(data: string): Promise<ImportResult>;
}
