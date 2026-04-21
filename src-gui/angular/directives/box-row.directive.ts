import { Directive, ElementRef, OnInit, inject } from "@angular/core";

@Directive({
  selector: "[appBoxRow]",
  standalone: true,
  host: {
    "(click)": "onClick($event)",
  },
})
export class BoxRowDirective implements OnInit {
  el: HTMLElement = null;
  formEls: Element[];

  constructor() {
    this.el = inject(ElementRef).nativeElement;
  }

  ngOnInit(): void {
    this.formEls = Array.from(
      this.el.querySelectorAll('input:not([type="hidden"]), select, textarea'),
    );
    this.formEls.forEach((formEl) => {
      formEl.addEventListener(
        "focus",
        () => {
          this.el.classList.add("active");
        },
        false,
      );

      formEl.addEventListener(
        "blur",
        () => {
          this.el.classList.remove("active");
        },
        false,
      );
    });
  }

  onClick(event: Event) {
    const target = event.target as HTMLElement;
    if (
      target !== this.el &&
      !target.classList.contains("progress") &&
      !target.classList.contains("progress-bar")
    ) {
      return;
    }

    if (this.formEls.length > 0) {
      const formEl = this.formEls[0] as HTMLElement;
      if (formEl.tagName.toLowerCase() === "input") {
        const inputEl = formEl as HTMLInputElement;
        if (inputEl.type != null && inputEl.type.toLowerCase() === "checkbox") {
          inputEl.click();
          return;
        }
      }
      formEl.focus();
    }
  }
}
