import { Directive, Input, OnInit } from "@angular/core";
import {
  AbstractControl,
  ControlValueAccessor,
  FormBuilder,
  ValidationErrors,
  Validator,
} from "@angular/forms";

import { I18nService } from "jslib-common/abstractions/i18n.service";
import { PolicyService } from "jslib-common/abstractions/policy.service";
import { PolicyType } from "jslib-common/enums/policyType";
import { Policy } from "jslib-common/models/domain/policy";

@Directive()
export class VaultTimeoutInputComponent implements ControlValueAccessor, Validator, OnInit {
  get showCustom() {
    return this.form.get("vaultTimeout").value === VaultTimeoutInputComponent.CUSTOM_VALUE;
  }

  static CUSTOM_VALUE = -100;

  form = this.formBuilder.group({
    vaultTimeout: [null],
    custom: this.formBuilder.group({
      hours: [null],
      minutes: [null],
    }),
  });

  @Input() vaultTimeouts: { name: string; value: number }[];
  vaultTimeoutPolicy: Policy;
  vaultTimeoutPolicyHours: number;
  vaultTimeoutPolicyMinutes: number;

  private onChange: (vaultTimeout: number) => void;
  private validatorChange: () => void;

  constructor(
    private formBuilder: FormBuilder,
    private policyService: PolicyService,
    private i18nService: I18nService
  ) {}

  async ngOnInit() {
    if (await this.policyService.policyAppliesToUser(PolicyType.MaximumVaultTimeout)) {
      const vaultTimeoutPolicy = await this.policyService.getAll(PolicyType.MaximumVaultTimeout);

      this.vaultTimeoutPolicy = vaultTimeoutPolicy[0];
      this.vaultTimeoutPolicyHours = Math.floor(this.vaultTimeoutPolicy.data.minutes / 60);
      this.vaultTimeoutPolicyMinutes = this.vaultTimeoutPolicy.data.minutes % 60;

      this.vaultTimeouts = this.vaultTimeouts.filter(
        (t) =>
          t.value <= this.vaultTimeoutPolicy.data.minutes &&
          (t.value > 0 || t.value === VaultTimeoutInputComponent.CUSTOM_VALUE) &&
          t.value != null
      );
      this.validatorChange();
    }

    this.form.valueChanges.subscribe(async (value) => {
      this.onChange(this.getVaultTimeout(value));
    });

    // Assign the previous value to the custom fields
    this.form.get("vaultTimeout").valueChanges.subscribe((value) => {
      if (value !== VaultTimeoutInputComponent.CUSTOM_VALUE) {
        return;
      }

      const current = Math.max(this.form.value.vaultTimeout, 0);
      this.form.patchValue({
        custom: {
          hours: Math.floor(current / 60),
          minutes: current % 60,
        },
      });
    });
  }

  ngOnChanges() {
    this.vaultTimeouts.push({
      name: this.i18nService.t("custom"),
      value: VaultTimeoutInputComponent.CUSTOM_VALUE,
    });
  }

  getVaultTimeout(value: any) {
    if (value.vaultTimeout !== VaultTimeoutInputComponent.CUSTOM_VALUE) {
      return value.vaultTimeout;
    }

    return value.custom.hours * 60 + value.custom.minutes;
  }

  writeValue(value: number): void {
    if (value == null) {
      return;
    }

    if (this.vaultTimeouts.every((p) => p.value !== value)) {
      this.form.setValue({
        vaultTimeout: VaultTimeoutInputComponent.CUSTOM_VALUE,
        custom: {
          hours: Math.floor(value / 60),
          minutes: value % 60,
        },
      });
      return;
    }

    this.form.patchValue({
      vaultTimeout: value,
    });
  }

  registerOnChange(onChange: any): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: any): void {
    // Empty
  }

  setDisabledState?(isDisabled: boolean): void {
    // Empty
  }

  validate(control: AbstractControl): ValidationErrors {
    if (this.vaultTimeoutPolicy && this.vaultTimeoutPolicy?.data?.minutes < control.value) {
      return { policyError: true };
    }

    return null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.validatorChange = fn;
  }
}
