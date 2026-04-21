import { Directive, ElementRef, inject } from "@angular/core";

@Directive({
  selector: "[appBlurClick]",
  standalone: true,
  host: {
    "(click)": "onClick()",
  },
})
export class BlurClickDirective {
  private el = inject(ElementRef);

  onClick() {
    this.el.nativeElement.blur();
  }
}
