import { Directive, Input } from "@angular/core";

import { EventService } from "jslib-common/abstractions/event.service";
import { EventType } from "jslib-common/enums/eventType";
import { FieldType } from "jslib-common/enums/fieldType";
import { CipherView } from "jslib-common/models/view/cipherView";
import { FieldView } from "jslib-common/models/view/fieldView";

@Directive()
export class ViewCustomFieldsComponent {
  @Input() cipher: CipherView;
  @Input() promptPassword: () => Promise<boolean>;
  @Input() copy: (value: string, typeI18nKey: string, aType: string) => void;

  fieldType = FieldType;

  constructor(private eventService: EventService) {}

  async toggleFieldValue(field: FieldView) {
    if (!(await this.promptPassword())) {
      return;
    }

    const f = field as any;
    f.showValue = !f.showValue;
    f.showCount = false;
    if (f.showValue) {
      this.eventService.collect(EventType.Cipher_ClientToggledHiddenFieldVisible, this.cipher.id);
    }
  }

  async toggleFieldCount(field: FieldView) {
    if (!field.showValue) {
      return;
    }

    field.showCount = !field.showCount;
  }
}
