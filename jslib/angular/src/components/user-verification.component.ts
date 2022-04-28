import { animate, style, transition, trigger } from "@angular/animations";
import { Component, OnInit } from "@angular/core";
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR } from "@angular/forms";

import { KeyConnectorService } from "jslib-common/abstractions/keyConnector.service";
import { UserVerificationService } from "jslib-common/abstractions/userVerification.service";
import { VerificationType } from "jslib-common/enums/verificationType";
import { Verification } from "jslib-common/types/verification";

/**
 * Used for general-purpose user verification throughout the app.
 * Collects the user's master password, or if they are using Key Connector, prompts for an OTP via email.
 * This is exposed to the parent component via the ControlValueAccessor interface (e.g. bind it to a FormControl).
 * Use UserVerificationService to verify the user's input.
 */
@Component({
  selector: "app-user-verification",
  templateUrl: "user-verification.component.html",
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: UserVerificationComponent,
    },
  ],
  animations: [
    trigger("sent", [
      transition(":enter", [style({ opacity: 0 }), animate("100ms", style({ opacity: 1 }))]),
    ]),
  ],
})
export class UserVerificationComponent implements ControlValueAccessor, OnInit {
  usesKeyConnector = false;
  disableRequestOTP = false;
  sentCode = false;

  secret = new FormControl("");

  private onChange: (value: Verification) => void;

  constructor(
    private keyConnectorService: KeyConnectorService,
    private userVerificationService: UserVerificationService
  ) {}

  async ngOnInit() {
    this.usesKeyConnector = await this.keyConnectorService.getUsesKeyConnector();
    this.processChanges(this.secret.value);

    this.secret.valueChanges.subscribe((secret: string) => this.processChanges(secret));
  }

  async requestOTP() {
    if (this.usesKeyConnector) {
      this.disableRequestOTP = true;
      try {
        await this.userVerificationService.requestOTP();
        this.sentCode = true;
      } finally {
        this.disableRequestOTP = false;
      }
    }
  }

  writeValue(obj: any): void {
    this.secret.setValue(obj);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    // Not implemented
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disableRequestOTP = isDisabled;
    if (isDisabled) {
      this.secret.disable();
    } else {
      this.secret.enable();
    }
  }

  private processChanges(secret: string) {
    if (this.onChange == null) {
      return;
    }

    this.onChange({
      type: this.usesKeyConnector ? VerificationType.OTP : VerificationType.MasterPassword,
      secret: secret,
    });
  }
}
