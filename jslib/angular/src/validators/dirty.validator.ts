import { AbstractControl, ValidationErrors, Validators } from "@angular/forms";

/**
 * Runs Validators.required on a field only if it's dirty. This prevents error messages from being displayed
 * to the user prematurely.
 */
export function dirtyRequired(control: AbstractControl): ValidationErrors | null {
  return control.dirty ? Validators.required(control) : null;
}
