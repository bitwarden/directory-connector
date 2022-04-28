import { EncString } from "../domain/encString";
import { Folder as FolderDomain } from "../domain/folder";
import { FolderView } from "../view/folderView";

export class Folder {
  static template(): Folder {
    const req = new Folder();
    req.name = "Folder name";
    return req;
  }

  static toView(req: Folder, view = new FolderView()) {
    view.name = req.name;
    return view;
  }

  static toDomain(req: Folder, domain = new FolderDomain()) {
    domain.name = req.name != null ? new EncString(req.name) : null;
    return domain;
  }

  name: string;

  // Use build method instead of ctor so that we can control order of JSON stringify for pretty print
  build(o: FolderView | FolderDomain) {
    if (o instanceof FolderView) {
      this.name = o.name;
    } else {
      this.name = o.name?.encryptedString;
    }
  }
}
