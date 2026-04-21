import { Directive } from "@angular/core";

@Directive({
  selector: "[appStopClick]",
  standalone: true,
  host: {
    "(click)": "onClick($event)",
  },
})
export class StopClickDirective {
  onClick($event: MouseEvent) {
    $event.preventDefault();
  }
}
