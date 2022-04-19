import { Directive, ElementRef, HostListener } from "@angular/core";

@Directive({
  selector: "input[appInputStripSpaces]",
})
export class InputStripSpacesDirective {
  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener("input") onInput() {
    this.el.nativeElement.value = this.el.nativeElement.value.replace(/ /g, "");
  }
}
