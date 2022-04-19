import { Directive, ElementRef, HostListener } from "@angular/core";

import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";

@Directive({
  selector: "[appSelectCopy]",
})
export class SelectCopyDirective {
  constructor(private el: ElementRef, private platformUtilsService: PlatformUtilsService) {}

  @HostListener("copy") onCopy() {
    if (window == null) {
      return;
    }
    let copyText = "";
    const selection = window.getSelection();
    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i);
      const text = range.toString();

      // The selection should only contain one line of text. In some cases however, the
      // selection contains newlines and space characters from the indentation of following
      // sibling nodes. To avoid copying passwords containing trailing newlines and spaces
      // that aren't part of the password, the selection has to be trimmed.
      let stringEndPos = text.length;
      const newLinePos = text.search(/(?:\r\n|\r|\n)/);
      if (newLinePos > -1) {
        const otherPart = text.substr(newLinePos).trim();
        if (otherPart === "") {
          stringEndPos = newLinePos;
        }
      }
      copyText += text.substring(0, stringEndPos);
    }
    this.platformUtilsService.copyToClipboard(copyText, { window: window });
  }
}
