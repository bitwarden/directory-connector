import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import { Directive, Input, OnChanges, SimpleChanges } from "@angular/core";

import { EventService } from "jslib-common/abstractions/event.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { CipherType } from "jslib-common/enums/cipherType";
import { EventType } from "jslib-common/enums/eventType";
import { FieldType } from "jslib-common/enums/fieldType";
import { Utils } from "jslib-common/misc/utils";
import { CipherView } from "jslib-common/models/view/cipherView";
import { FieldView } from "jslib-common/models/view/fieldView";

@Directive()
export class AddEditCustomFieldsComponent implements OnChanges {
  @Input() cipher: CipherView;
  @Input() thisCipherType: CipherType;
  @Input() editMode: boolean;

  addFieldType: FieldType = FieldType.Text;
  addFieldTypeOptions: any[];
  addFieldLinkedTypeOption: any;
  linkedFieldOptions: any[] = [];

  cipherType = CipherType;
  fieldType = FieldType;
  eventType = EventType;

  constructor(private i18nService: I18nService, private eventService: EventService) {
    this.addFieldTypeOptions = [
      { name: i18nService.t("cfTypeText"), value: FieldType.Text },
      { name: i18nService.t("cfTypeHidden"), value: FieldType.Hidden },
      { name: i18nService.t("cfTypeBoolean"), value: FieldType.Boolean },
    ];
    this.addFieldLinkedTypeOption = {
      name: this.i18nService.t("cfTypeLinked"),
      value: FieldType.Linked,
    };
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.thisCipherType != null) {
      this.setLinkedFieldOptions();

      if (!changes.thisCipherType.firstChange) {
        this.resetCipherLinkedFields();
      }
    }
  }

  addField() {
    if (this.cipher.fields == null) {
      this.cipher.fields = [];
    }

    const f = new FieldView();
    f.type = this.addFieldType;
    f.newField = true;

    if (f.type === FieldType.Linked) {
      f.linkedId = this.linkedFieldOptions[0].value;
    }

    this.cipher.fields.push(f);
  }

  removeField(field: FieldView) {
    const i = this.cipher.fields.indexOf(field);
    if (i > -1) {
      this.cipher.fields.splice(i, 1);
    }
  }

  toggleFieldValue(field: FieldView) {
    const f = field as any;
    f.showValue = !f.showValue;
    if (this.editMode && f.showValue) {
      this.eventService.collect(EventType.Cipher_ClientToggledHiddenFieldVisible, this.cipher.id);
    }
  }

  trackByFunction(index: number, item: any) {
    return index;
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.cipher.fields, event.previousIndex, event.currentIndex);
  }

  private setLinkedFieldOptions() {
    if (this.cipher.linkedFieldOptions == null) {
      return;
    }

    const options: any = [];
    this.cipher.linkedFieldOptions.forEach((linkedFieldOption, id) =>
      options.push({ name: this.i18nService.t(linkedFieldOption.i18nKey), value: id })
    );
    this.linkedFieldOptions = options.sort(Utils.getSortFunction(this.i18nService, "name"));
  }

  private resetCipherLinkedFields() {
    if (this.cipher.fields == null || this.cipher.fields.length === 0) {
      return;
    }

    // Delete any Linked custom fields if the item type does not support them
    if (this.cipher.linkedFieldOptions == null) {
      this.cipher.fields = this.cipher.fields.filter((f) => f.type !== FieldType.Linked);
      return;
    }

    this.cipher.fields
      .filter((f) => f.type === FieldType.Linked)
      .forEach((f) => (f.linkedId = this.linkedFieldOptions[0].value));
  }
}
