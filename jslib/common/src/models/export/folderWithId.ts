import { Folder as FolderDomain } from "../domain/folder";
import { FolderView } from "../view/folderView";

import { Folder } from "./folder";

export class FolderWithId extends Folder {
  id: string;

  // Use build method instead of ctor so that we can control order of JSON stringify for pretty print
  build(o: FolderView | FolderDomain) {
    this.id = o.id;
    super.build(o);
  }
}
