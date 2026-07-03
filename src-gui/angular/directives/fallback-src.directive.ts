import { Directive, ElementRef, Input, inject } from "@angular/core";

@Directive({
  selector: "[appFallbackSrc]",
  standalone: true,
  host: {
    "(error)": "onError()",
  },
})
export class FallbackSrcDirective {
  @Input("appFallbackSrc") appFallbackSrc: string;

  private el = inject(ElementRef);

  onError() {
    this.el.nativeElement.src = this.appFallbackSrc;
  }
}
