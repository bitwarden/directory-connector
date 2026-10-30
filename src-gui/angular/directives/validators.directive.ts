import { Directive, forwardRef, inject, input } from "@angular/core";
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from "@angular/forms";

import { I18nService } from "@/libs/abstractions/i18n.service";

/**
 * Validates that an `ngModel` input holds a URL. Empty values are left to `required`.
 *
 * - `appUrl` accepts a bare host such as `bitwarden.company.com`, which the environment
 *   service later prefixes with `https://`.
 * - `appUrl="https"` requires an explicit `https://` URL.
 *
 * Errors are reported as `{ url: { message } }` so `bit-error` can display them.
 */
@Directive({
  selector: "[appUrl][ngModel]",
  standalone: true,
  providers: [
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => UrlValidatorDirective), multi: true },
  ],
})
export class UrlValidatorDirective implements Validator {
  readonly appUrl = input<"" | "https">("");

  private i18nService = inject(I18nService);

  validate(control: AbstractControl): ValidationErrors | null {
    const value = typeof control.value === "string" ? control.value.trim() : "";
    if (value === "") {
      return null;
    }

    const requireHttps = this.appUrl() === "https";
    if (requireHttps && !value.toLowerCase().startsWith("https://")) {
      return { url: { message: this.i18nService.t("invalidHttpsUrl") } };
    }

    return isValidUrl(value.includes("://") ? value : `https://${value}`)
      ? null
      : { url: { message: this.i18nService.t("invalidUrl") } };
  }
}

/** Validates that an `ngModel` input holds a TCP port number (1-65535). Empty values are allowed. */
@Directive({
  selector: "[appPort][ngModel]",
  standalone: true,
  providers: [
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => PortValidatorDirective), multi: true },
  ],
})
export class PortValidatorDirective implements Validator {
  private i18nService = inject(I18nService);

  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value == null ? "" : String(control.value).trim();
    if (value === "") {
      return null;
    }

    const port = Number(value);
    return /^\d+$/.test(value) && port >= 1 && port <= 65535
      ? null
      : { port: { message: this.i18nService.t("invalidPort") } };
  }
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname !== "";
  } catch {
    return false;
  }
}
