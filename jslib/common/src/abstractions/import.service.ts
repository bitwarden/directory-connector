import { ImportOption, ImportType } from "../enums/importOptions";
import { ImportError } from "../importers/importError";
import { Importer } from "../importers/importer";

export abstract class ImportService {
  featuredImportOptions: readonly ImportOption[];
  regularImportOptions: readonly ImportOption[];
  getImportOptions: () => ImportOption[];
  import: (
    importer: Importer,
    fileContents: string,
    organizationId?: string
  ) => Promise<ImportError>;
  getImporter: (
    format: ImportType | "bitwardenpasswordprotected",
    organizationId: string,
    password?: string
  ) => Importer;
}
