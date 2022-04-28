import { CipherRequest } from "./cipherRequest";
import { FolderRequest } from "./folderRequest";
import { KvpRequest } from "./kvpRequest";

export class ImportCiphersRequest {
  ciphers: CipherRequest[] = [];
  folders: FolderRequest[] = [];
  folderRelationships: KvpRequest<number, number>[] = [];
}
