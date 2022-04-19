import { DatePipe } from "@angular/common";
import { Directive, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormControl, FormGroup } from "@angular/forms";

import { I18nService } from "jslib-common/abstractions/i18n.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";

// Different BrowserPath = different controls.
enum BrowserPath {
  // Native datetime-locale.
  // We are happy.
  Default = "default",

  // Native date and time inputs, but no datetime-locale.
  // We use individual date and time inputs and create a datetime programatically on submit.
  Firefox = "firefox",

  // No native date, time, or datetime-locale inputs.
  // We use a polyfill for dates and a dropdown for times.
  Safari = "safari",
}

enum DateField {
  DeletionDate = "deletion",
  ExpriationDate = "expiration",
}

// Value = hours
enum DatePreset {
  OneHour = 1,
  OneDay = 24,
  TwoDays = 48,
  ThreeDays = 72,
  SevenDays = 168,
  ThirtyDays = 720,
  Custom = 0,
  Never = null,
}

// TimeOption is used for the dropdown implementation of custom times
// twelveHour = displayed time; twentyFourHour = time used in logic
interface TimeOption {
  twelveHour: string;
  twentyFourHour: string;
}

@Directive()
export class EffluxDatesComponent implements OnInit {
  @Input() readonly initialDeletionDate: Date;
  @Input() readonly initialExpirationDate: Date;
  @Input() readonly editMode: boolean;
  @Input() readonly disabled: boolean;

  @Output() datesChanged = new EventEmitter<{ deletionDate: string; expirationDate: string }>();

  get browserPath(): BrowserPath {
    if (this.platformUtilsService.isFirefox()) {
      return BrowserPath.Firefox;
    } else if (this.platformUtilsService.isSafari()) {
      return BrowserPath.Safari;
    }
    return BrowserPath.Default;
  }

  datesForm = new FormGroup({
    selectedDeletionDatePreset: new FormControl(),
    selectedExpirationDatePreset: new FormControl(),
    defaultDeletionDateTime: new FormControl(),
    defaultExpirationDateTime: new FormControl(),
    fallbackDeletionDate: new FormControl(),
    fallbackDeletionTime: new FormControl(),
    fallbackExpirationDate: new FormControl(),
    fallbackExpirationTime: new FormControl(),
  });

  deletionDatePresets: any[] = [
    { name: this.i18nService.t("oneHour"), value: DatePreset.OneHour },
    { name: this.i18nService.t("oneDay"), value: DatePreset.OneDay },
    { name: this.i18nService.t("days", "2"), value: DatePreset.TwoDays },
    { name: this.i18nService.t("days", "3"), value: DatePreset.ThreeDays },
    { name: this.i18nService.t("days", "7"), value: DatePreset.SevenDays },
    { name: this.i18nService.t("days", "30"), value: DatePreset.ThirtyDays },
    { name: this.i18nService.t("custom"), value: DatePreset.Custom },
  ];

  expirationDatePresets: any[] = [
    { name: this.i18nService.t("never"), value: DatePreset.Never },
  ].concat([...this.deletionDatePresets]);

  get selectedDeletionDatePreset(): FormControl {
    return this.datesForm.get("selectedDeletionDatePreset") as FormControl;
  }

  get selectedExpirationDatePreset(): FormControl {
    return this.datesForm.get("selectedExpirationDatePreset") as FormControl;
  }

  get defaultDeletionDateTime(): FormControl {
    return this.datesForm.get("defaultDeletionDateTime") as FormControl;
  }

  get defaultExpirationDateTime(): FormControl {
    return this.datesForm.get("defaultExpirationDateTime") as FormControl;
  }

  get fallbackDeletionDate(): FormControl {
    return this.datesForm.get("fallbackDeletionDate") as FormControl;
  }

  get fallbackDeletionTime(): FormControl {
    return this.datesForm.get("fallbackDeletionTime") as FormControl;
  }

  get fallbackExpirationDate(): FormControl {
    return this.datesForm.get("fallbackExpirationDate") as FormControl;
  }

  get fallbackExpirationTime(): FormControl {
    return this.datesForm.get("fallbackExpirationTime") as FormControl;
  }

  // Should be able to call these at any time and compute a submitable value
  get formattedDeletionDate(): string {
    switch (this.selectedDeletionDatePreset.value as DatePreset) {
      case DatePreset.Never:
        this.selectedDeletionDatePreset.setValue(DatePreset.SevenDays);
        return this.formattedDeletionDate;
      case DatePreset.Custom:
        switch (this.browserPath) {
          case BrowserPath.Safari:
          case BrowserPath.Firefox:
            return this.fallbackDeletionDate.value + "T" + this.fallbackDeletionTime.value;
          default:
            return this.defaultDeletionDateTime.value;
        }
      default: {
        const now = new Date();
        const miliseconds = now.setTime(
          now.getTime() + (this.selectedDeletionDatePreset.value as number) * 60 * 60 * 1000
        );
        return new Date(miliseconds).toString();
      }
    }
  }

  get formattedExpirationDate(): string {
    switch (this.selectedExpirationDatePreset.value as DatePreset) {
      case DatePreset.Never:
        return null;
      case DatePreset.Custom:
        switch (this.browserPath) {
          case BrowserPath.Safari:
          case BrowserPath.Firefox:
            if (
              (!this.fallbackExpirationDate.value || !this.fallbackExpirationTime.value) &&
              this.editMode
            ) {
              return null;
            }
            return this.fallbackExpirationDate.value + "T" + this.fallbackExpirationTime.value;
          default:
            if (!this.defaultExpirationDateTime.value) {
              return null;
            }
            return this.defaultExpirationDateTime.value;
        }
      default: {
        const now = new Date();
        const miliseconds = now.setTime(
          now.getTime() + (this.selectedExpirationDatePreset.value as number) * 60 * 60 * 1000
        );
        return new Date(miliseconds).toString();
      }
    }
  }
  //

  get safariDeletionTimePresetOptions() {
    return this.safariTimePresetOptions(DateField.DeletionDate);
  }

  get safariExpirationTimePresetOptions() {
    return this.safariTimePresetOptions(DateField.ExpriationDate);
  }

  private get nextWeek(): Date {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  }

  constructor(
    protected i18nService: I18nService,
    protected platformUtilsService: PlatformUtilsService,
    protected datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.setInitialFormValues();
    this.emitDates();
    this.datesForm.valueChanges.subscribe(() => {
      this.emitDates();
    });
  }

  onDeletionDatePresetSelect(value: DatePreset) {
    this.selectedDeletionDatePreset.setValue(value);
  }

  clearExpiration() {
    switch (this.browserPath) {
      case BrowserPath.Safari:
      case BrowserPath.Firefox:
        this.fallbackExpirationDate.setValue(null);
        this.fallbackExpirationTime.setValue(null);
        break;
      case BrowserPath.Default:
        this.defaultExpirationDateTime.setValue(null);
        break;
    }
  }

  protected emitDates() {
    this.datesChanged.emit({
      deletionDate: this.formattedDeletionDate,
      expirationDate: this.formattedExpirationDate,
    });
  }

  protected setInitialFormValues() {
    if (this.editMode) {
      this.selectedDeletionDatePreset.setValue(DatePreset.Custom);
      this.selectedExpirationDatePreset.setValue(DatePreset.Custom);
      switch (this.browserPath) {
        case BrowserPath.Safari:
        case BrowserPath.Firefox:
          this.fallbackDeletionDate.setValue(this.initialDeletionDate.toISOString().slice(0, 10));
          this.fallbackDeletionTime.setValue(this.initialDeletionDate.toTimeString().slice(0, 5));
          if (this.initialExpirationDate != null) {
            this.fallbackExpirationDate.setValue(
              this.initialExpirationDate.toISOString().slice(0, 10)
            );
            this.fallbackExpirationTime.setValue(
              this.initialExpirationDate.toTimeString().slice(0, 5)
            );
          }
          break;
        case BrowserPath.Default:
          if (this.initialExpirationDate) {
            this.defaultExpirationDateTime.setValue(
              this.datePipe.transform(new Date(this.initialExpirationDate), "yyyy-MM-ddTHH:mm")
            );
          }
          this.defaultDeletionDateTime.setValue(
            this.datePipe.transform(new Date(this.initialDeletionDate), "yyyy-MM-ddTHH:mm")
          );
          break;
      }
    } else {
      this.selectedDeletionDatePreset.setValue(DatePreset.SevenDays);
      this.selectedExpirationDatePreset.setValue(DatePreset.Never);

      switch (this.browserPath) {
        case BrowserPath.Safari:
          this.fallbackDeletionDate.setValue(this.nextWeek.toISOString().slice(0, 10));
          this.fallbackDeletionTime.setValue(
            this.safariTimePresetOptions(DateField.DeletionDate)[1].twentyFourHour
          );
          break;
        default:
          break;
      }
    }
  }

  protected safariTimePresetOptions(field: DateField): TimeOption[] {
    // init individual arrays for major sort groups
    const noon: TimeOption[] = [];
    const midnight: TimeOption[] = [];
    const ams: TimeOption[] = [];
    const pms: TimeOption[] = [];

    // determine minute skip (5 min, 10 min, 15 min, etc.)
    const minuteIncrementer = 15;

    // loop through each hour on a 12 hour system
    for (let h = 1; h <= 12; h++) {
      // loop through each minute in the hour using the skip to incriment
      for (let m = 0; m < 60; m += minuteIncrementer) {
        // init the final strings that will be added to the lists
        let hour = h.toString();
        let minutes = m.toString();

        // add prepending 0s to single digit hours/minutes
        if (h < 10) {
          hour = "0" + hour;
        }
        if (m < 10) {
          minutes = "0" + minutes;
        }

        // build time strings and push to relevant sort groups
        if (h === 12) {
          const midnightOption: TimeOption = {
            twelveHour: `${hour}:${minutes} AM`,
            twentyFourHour: `00:${minutes}`,
          };
          midnight.push(midnightOption);

          const noonOption: TimeOption = {
            twelveHour: `${hour}:${minutes} PM`,
            twentyFourHour: `${hour}:${minutes}`,
          };
          noon.push(noonOption);
        } else {
          const amOption: TimeOption = {
            twelveHour: `${hour}:${minutes} AM`,
            twentyFourHour: `${hour}:${minutes}`,
          };
          ams.push(amOption);

          const pmOption: TimeOption = {
            twelveHour: `${hour}:${minutes} PM`,
            twentyFourHour: `${h + 12}:${minutes}`,
          };
          pms.push(pmOption);
        }
      }
    }

    // bring all the arrays together in the right order
    const validTimes = [...midnight, ...ams, ...noon, ...pms];

    // determine if an unsupported value already exists on the send & add that to the top of the option list
    // example: if the Send was created with a different client
    if (field === DateField.ExpriationDate && this.initialExpirationDate != null && this.editMode) {
      const previousValue: TimeOption = {
        twelveHour: this.datePipe.transform(this.initialExpirationDate, "hh:mm a"),
        twentyFourHour: this.datePipe.transform(this.initialExpirationDate, "HH:mm"),
      };
      return [previousValue, { twelveHour: null, twentyFourHour: null }, ...validTimes];
    } else if (
      field === DateField.DeletionDate &&
      this.initialDeletionDate != null &&
      this.editMode
    ) {
      const previousValue: TimeOption = {
        twelveHour: this.datePipe.transform(this.initialDeletionDate, "hh:mm a"),
        twentyFourHour: this.datePipe.transform(this.initialDeletionDate, "HH:mm"),
      };
      return [previousValue, ...validTimes];
    } else {
      return [{ twelveHour: null, twentyFourHour: null }, ...validTimes];
    }
  }
}
