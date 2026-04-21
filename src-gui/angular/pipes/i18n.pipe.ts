import { Pipe, PipeTransform, inject } from "@angular/core";

import { I18nService } from "@/libs/abstractions/i18n.service";

@Pipe({
  name: "i18n",
  standalone: true,
})
export class I18nPipe implements PipeTransform {
  private i18nService = inject(I18nService);

  transform(id: string, p1?: string, p2?: string, p3?: string): string {
    return this.i18nService.t(id, p1, p2, p3);
  }
}
