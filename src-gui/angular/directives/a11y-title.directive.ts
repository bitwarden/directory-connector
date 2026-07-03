import { Directive, ElementRef, Input, Renderer2, inject } from "@angular/core";

@Directive({
  selector: "[appA11yTitle]",
  standalone: true,
})
export class A11yTitleDirective {
  @Input() set appA11yTitle(title: string) {
    this.title = title;
  }

  private title: string;
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);

  ngOnInit() {
    if (!this.el.nativeElement.hasAttribute("title")) {
      this.renderer.setAttribute(this.el.nativeElement, "title", this.title);
    }
    if (!this.el.nativeElement.hasAttribute("aria-label")) {
      this.renderer.setAttribute(this.el.nativeElement, "aria-label", this.title);
    }
  }
}
