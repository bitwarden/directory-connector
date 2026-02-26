import { InjectionToken } from "@angular/core";

import { StorageService } from "../../../jslib/common/src/abstractions/storage.service";

declare const tag: unique symbol;
/**
 * A (more) typesafe version of InjectionToken which will more strictly enforce the generic type parameter.
 * @remarks The default angular implementation does not use the generic type to define the structure of the object,
 * so the structural type system will not complain about a mismatch in the type parameter.
 * This is solved by assigning T to an arbitrary private property.
 */
export class SafeInjectionToken<T> extends InjectionToken<T> {
  private readonly [tag]: T;
}

export const SECURE_STORAGE = new SafeInjectionToken<StorageService>("SECURE_STORAGE");
export const WINDOW = new SafeInjectionToken<Window>("WINDOW");
