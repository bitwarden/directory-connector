import { CipherRequest } from "./cipherRequest";
import { CollectionRequest } from "./collectionRequest";
import { KvpRequest } from "./kvpRequest";

export class ImportOrganizationCiphersRequest {
  ciphers: CipherRequest[] = [];
  collections: CollectionRequest[] = [];
  collectionRelationships: KvpRequest<number, number>[] = [];
}
