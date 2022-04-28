import { CipherView } from "../view/cipherView";
import { CollectionView } from "../view/collectionView";
import { FolderView } from "../view/folderView";

export class ImportResult {
  success = false;
  missingPassword = false;
  errorMessage: string;
  ciphers: CipherView[] = [];
  folders: FolderView[] = [];
  folderRelationships: [number, number][] = [];
  collections: CollectionView[] = [];
  collectionRelationships: [number, number][] = [];
}
