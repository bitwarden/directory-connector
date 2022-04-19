import { SendFile } from "../domain/sendFile";

import { View } from "./view";

export class SendFileView implements View {
  id: string = null;
  size: string = null;
  sizeName: string = null;
  fileName: string = null;

  constructor(f?: SendFile) {
    if (!f) {
      return;
    }

    this.id = f.id;
    this.size = f.size;
    this.sizeName = f.sizeName;
  }

  get fileSize(): number {
    try {
      if (this.size != null) {
        return parseInt(this.size, null);
      }
    } catch {
      // Invalid file size.
    }
    return 0;
  }
}
