import { LinkedMetadata } from "../../misc/linkedFieldOption.decorator";

import { View } from "./view";

export abstract class ItemView implements View {
  linkedFieldOptions: Map<number, LinkedMetadata>;
  abstract get subTitle(): string;
}
