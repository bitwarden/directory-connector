import { Directive, ElementRef, HostListener, Input } from "@angular/core";

@Directive({
  selector: "[appFallbackSrc]",
  standalone: false,
})
export class FallbackSrcDirective {
  @Input("appFallbackSrc") appFallbackSrc: string;

  constructor(private el: ElementRef) {}

  @HostListener("error") onError() {
    this.el.nativeElement.src = this.appFallbackSrc;
  }
}
