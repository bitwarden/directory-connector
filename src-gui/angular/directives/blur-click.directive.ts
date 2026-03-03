import { Directive, ElementRef, HostListener } from "@angular/core";

@Directive({
  selector: "[appBlurClick]",
  standalone: false,
})
export class BlurClickDirective {
  constructor(private el: ElementRef) {}

  @HostListener("click") onClick() {
    this.el.nativeElement.blur();
  }
}
