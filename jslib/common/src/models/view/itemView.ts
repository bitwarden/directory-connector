import { View } from "./view";

export abstract class ItemView implements View {
  linkedFieldOptions: Map<number, any>;
  abstract get subTitle(): string;
}
