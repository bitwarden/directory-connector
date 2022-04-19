import { LinkedIdType } from "../enums/linkedIdType";
import { ItemView } from "../models/view/itemView";

export class LinkedMetadata {
  constructor(readonly propertyKey: string, private readonly _i18nKey?: string) {}

  get i18nKey() {
    return this._i18nKey ?? this.propertyKey;
  }
}

/**
 * A decorator used to set metadata used by Linked custom fields. Apply it to a class property or getter to make it
 *    available as a Linked custom field option.
 * @param id - A unique value that is saved in the Field model. It is used to look up the decorated class property.
 * @param i18nKey - The i18n key used to describe the decorated class property in the UI. If it is null, then the name
 *    of the class property will be used as the i18n key.
 */
export function linkedFieldOption(id: LinkedIdType, i18nKey?: string) {
  return (prototype: ItemView, propertyKey: string) => {
    if (prototype.linkedFieldOptions == null) {
      prototype.linkedFieldOptions = new Map<LinkedIdType, LinkedMetadata>();
    }

    prototype.linkedFieldOptions.set(id, new LinkedMetadata(propertyKey, i18nKey));
  };
}
