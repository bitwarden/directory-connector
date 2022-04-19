import { Input, HostBinding, OnChanges, Directive, OnInit } from "@angular/core";

export type ButtonTypes = "primary" | "secondary" | "danger";

const buttonStyles: Record<ButtonTypes, string> = {
  primary: [
    "tw-border-primary-500",
    "tw-bg-primary-500",
    "!tw-text-contrast",
    "hover:tw-bg-primary-700",
    "hover:tw-border-primary-700",
    "focus:tw-bg-primary-700",
    "focus:tw-border-primary-700",
  ].join(" "),
  secondary: [
    "tw-bg-transparent",
    "tw-border-text-muted",
    "!tw-text-muted",
    "hover:tw-bg-secondary-500",
    "hover:tw-border-secondary-500",
    "hover:!tw-text-contrast",
    "focus:tw-bg-secondary-500",
    "focus:tw-border-secondary-500",
    "focus:!tw-text-contrast",
  ].join(" "),
  danger: [
    "tw-bg-transparent",
    "tw-border-danger-500",
    "!tw-text-danger",
    "hover:tw-bg-danger-500",
    "hover:tw-border-danger-500",
    "hover:!tw-text-contrast",
    "focus:tw-bg-danger-500",
    "focus:tw-border-danger-500",
    "focus:!tw-text-contrast",
  ].join(" "),
};

@Directive({
  selector: "button[bit-button], a[bit-button]",
})
export class ButtonComponent implements OnInit, OnChanges {
  @HostBinding("class") @Input() classList = "";

  @Input()
  buttonType: ButtonTypes = "secondary";

  @Input()
  block = false;

  ngOnInit(): void {
    this.classList = this.classes.join(" ");
  }

  ngOnChanges() {
    this.ngOnInit();
  }

  get classes(): string[] {
    return [
      "tw-font-semibold",
      "tw-py-1.5",
      "tw-px-3",
      "tw-rounded",
      "tw-transition",
      "tw-border",
      "tw-border-solid",
      "tw-text-center",
      "hover:tw-no-underline",
      "disabled:tw-bg-secondary-100",
      "disabled:tw-border-secondary-100",
      "disabled:!tw-text-main",
      "focus:tw-outline-none",
      "focus:tw-ring",
      "focus:tw-ring-offset-2",
      "focus:tw-ring-primary-700",
      this.block ? "tw-w-full tw-block" : "tw-inline-block",
      buttonStyles[this.buttonType ?? "secondary"],
    ];
  }
}
