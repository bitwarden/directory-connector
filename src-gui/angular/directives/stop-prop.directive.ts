import { Directive } from "@angular/core";

@Directive({
  selector: "[appStopProp]",
  standalone: true,
  host: {
    "(click)": "onClick($event)",
  },
})
export class StopPropDirective {
  onClick($event: MouseEvent) {
    $event.stopPropagation();
  }
}
