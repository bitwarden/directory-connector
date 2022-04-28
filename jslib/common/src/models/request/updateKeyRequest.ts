import { CipherWithIdRequest } from "./cipherWithIdRequest";
import { FolderWithIdRequest } from "./folderWithIdRequest";
import { SendWithIdRequest } from "./sendWithIdRequest";

export class UpdateKeyRequest {
  ciphers: CipherWithIdRequest[] = [];
  folders: FolderWithIdRequest[] = [];
  sends: SendWithIdRequest[] = [];
  masterPasswordHash: string;
  privateKey: string;
  key: string;
}
