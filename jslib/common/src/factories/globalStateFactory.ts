import { GlobalState } from "../models/domain/globalState";

export class GlobalStateFactory<T extends GlobalState = GlobalState> {
  private globalStateConstructor: new (init: Partial<T>) => T;

  constructor(globalStateConstructor: new (init: Partial<T>) => T) {
    this.globalStateConstructor = globalStateConstructor;
  }

  create(args?: Partial<T>) {
    return new this.globalStateConstructor(args);
  }
}
