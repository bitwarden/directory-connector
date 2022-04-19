import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

import { ButtonComponent } from "./button.component";

@NgModule({
  imports: [CommonModule],
  exports: [ButtonComponent],
  declarations: [ButtonComponent],
})
export class ButtonModule {}
