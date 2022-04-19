import {
  ChangeDetectorRef,
  Directive,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
} from "@angular/core";

import { ApiService } from "jslib-common/abstractions/api.service";
import { AuditService } from "jslib-common/abstractions/audit.service";
import { BroadcasterService } from "jslib-common/abstractions/broadcaster.service";
import { CipherService } from "jslib-common/abstractions/cipher.service";
import { CryptoService } from "jslib-common/abstractions/crypto.service";
import { EventService } from "jslib-common/abstractions/event.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { LogService } from "jslib-common/abstractions/log.service";
import { PasswordRepromptService } from "jslib-common/abstractions/passwordReprompt.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { StateService } from "jslib-common/abstractions/state.service";
import { TokenService } from "jslib-common/abstractions/token.service";
import { TotpService } from "jslib-common/abstractions/totp.service";
import { CipherRepromptType } from "jslib-common/enums/cipherRepromptType";
import { CipherType } from "jslib-common/enums/cipherType";
import { EventType } from "jslib-common/enums/eventType";
import { FieldType } from "jslib-common/enums/fieldType";
import { ErrorResponse } from "jslib-common/models/response/errorResponse";
import { AttachmentView } from "jslib-common/models/view/attachmentView";
import { CipherView } from "jslib-common/models/view/cipherView";
import { LoginUriView } from "jslib-common/models/view/loginUriView";

const BroadcasterSubscriptionId = "ViewComponent";

@Directive()
export class ViewComponent implements OnDestroy, OnInit {
  @Input() cipherId: string;
  @Output() onEditCipher = new EventEmitter<CipherView>();
  @Output() onCloneCipher = new EventEmitter<CipherView>();
  @Output() onShareCipher = new EventEmitter<CipherView>();
  @Output() onDeletedCipher = new EventEmitter<CipherView>();
  @Output() onRestoredCipher = new EventEmitter<CipherView>();

  cipher: CipherView;
  showPassword: boolean;
  showPasswordCount: boolean;
  showCardNumber: boolean;
  showCardCode: boolean;
  canAccessPremium: boolean;
  totpCode: string;
  totpCodeFormatted: string;
  totpDash: number;
  totpSec: number;
  totpLow: boolean;
  fieldType = FieldType;
  checkPasswordPromise: Promise<number>;

  private totpInterval: any;
  private previousCipherId: string;
  private passwordReprompted = false;

  constructor(
    protected cipherService: CipherService,
    protected totpService: TotpService,
    protected tokenService: TokenService,
    protected i18nService: I18nService,
    protected cryptoService: CryptoService,
    protected platformUtilsService: PlatformUtilsService,
    protected auditService: AuditService,
    protected win: Window,
    protected broadcasterService: BroadcasterService,
    protected ngZone: NgZone,
    protected changeDetectorRef: ChangeDetectorRef,
    protected eventService: EventService,
    protected apiService: ApiService,
    protected passwordRepromptService: PasswordRepromptService,
    private logService: LogService,
    protected stateService: StateService
  ) {}

  ngOnInit() {
    this.broadcasterService.subscribe(BroadcasterSubscriptionId, (message: any) => {
      this.ngZone.run(async () => {
        switch (message.command) {
          case "syncCompleted":
            if (message.successfully) {
              await this.load();
              this.changeDetectorRef.detectChanges();
            }
            break;
        }
      });
    });
  }

  ngOnDestroy() {
    this.broadcasterService.unsubscribe(BroadcasterSubscriptionId);
    this.cleanUp();
  }

  async load() {
    this.cleanUp();

    const cipher = await this.cipherService.get(this.cipherId);
    this.cipher = await cipher.decrypt();
    this.canAccessPremium = await this.stateService.getCanAccessPremium();

    if (
      this.cipher.type === CipherType.Login &&
      this.cipher.login.totp &&
      (cipher.organizationUseTotp || this.canAccessPremium)
    ) {
      await this.totpUpdateCode();
      const interval = this.totpService.getTimeInterval(this.cipher.login.totp);
      await this.totpTick(interval);

      this.totpInterval = setInterval(async () => {
        await this.totpTick(interval);
      }, 1000);
    }

    if (this.previousCipherId !== this.cipherId) {
      this.eventService.collect(EventType.Cipher_ClientViewed, this.cipherId);
    }
    this.previousCipherId = this.cipherId;
  }

  async edit() {
    if (await this.promptPassword()) {
      this.onEditCipher.emit(this.cipher);
      return true;
    }

    return false;
  }

  async clone() {
    if (await this.promptPassword()) {
      this.onCloneCipher.emit(this.cipher);
      return true;
    }

    return false;
  }

  async share() {
    if (await this.promptPassword()) {
      this.onShareCipher.emit(this.cipher);
      return true;
    }

    return false;
  }

  async delete(): Promise<boolean> {
    if (!(await this.promptPassword())) {
      return;
    }

    const confirmed = await this.platformUtilsService.showDialog(
      this.i18nService.t(
        this.cipher.isDeleted ? "permanentlyDeleteItemConfirmation" : "deleteItemConfirmation"
      ),
      this.i18nService.t("deleteItem"),
      this.i18nService.t("yes"),
      this.i18nService.t("no"),
      "warning"
    );
    if (!confirmed) {
      return false;
    }

    try {
      await this.deleteCipher();
      this.platformUtilsService.showToast(
        "success",
        null,
        this.i18nService.t(this.cipher.isDeleted ? "permanentlyDeletedItem" : "deletedItem")
      );
      this.onDeletedCipher.emit(this.cipher);
    } catch (e) {
      this.logService.error(e);
    }

    return true;
  }

  async restore(): Promise<boolean> {
    if (!this.cipher.isDeleted) {
      return false;
    }

    const confirmed = await this.platformUtilsService.showDialog(
      this.i18nService.t("restoreItemConfirmation"),
      this.i18nService.t("restoreItem"),
      this.i18nService.t("yes"),
      this.i18nService.t("no"),
      "warning"
    );
    if (!confirmed) {
      return false;
    }

    try {
      await this.restoreCipher();
      this.platformUtilsService.showToast("success", null, this.i18nService.t("restoredItem"));
      this.onRestoredCipher.emit(this.cipher);
    } catch (e) {
      this.logService.error(e);
    }

    return true;
  }

  async togglePassword() {
    if (!(await this.promptPassword())) {
      return;
    }

    this.showPassword = !this.showPassword;
    this.showPasswordCount = false;
    if (this.showPassword) {
      this.eventService.collect(EventType.Cipher_ClientToggledPasswordVisible, this.cipherId);
    }
  }

  async togglePasswordCount() {
    if (!this.showPassword) {
      return;
    }

    this.showPasswordCount = !this.showPasswordCount;
  }

  async toggleCardNumber() {
    if (!(await this.promptPassword())) {
      return;
    }

    this.showCardNumber = !this.showCardNumber;
    if (this.showCardNumber) {
      this.eventService.collect(EventType.Cipher_ClientToggledCardCodeVisible, this.cipherId);
    }
  }

  async toggleCardCode() {
    if (!(await this.promptPassword())) {
      return;
    }

    this.showCardCode = !this.showCardCode;
    if (this.showCardCode) {
      this.eventService.collect(EventType.Cipher_ClientToggledCardCodeVisible, this.cipherId);
    }
  }

  async checkPassword() {
    if (
      this.cipher.login == null ||
      this.cipher.login.password == null ||
      this.cipher.login.password === ""
    ) {
      return;
    }

    this.checkPasswordPromise = this.auditService.passwordLeaked(this.cipher.login.password);
    const matches = await this.checkPasswordPromise;

    if (matches > 0) {
      this.platformUtilsService.showToast(
        "warning",
        null,
        this.i18nService.t("passwordExposed", matches.toString())
      );
    } else {
      this.platformUtilsService.showToast("success", null, this.i18nService.t("passwordSafe"));
    }
  }

  launch(uri: LoginUriView, cipherId?: string) {
    if (!uri.canLaunch) {
      return;
    }

    if (cipherId) {
      this.cipherService.updateLastLaunchedDate(cipherId);
    }

    this.platformUtilsService.launchUri(uri.launchUri);
  }

  async copy(value: string, typeI18nKey: string, aType: string) {
    if (value == null) {
      return;
    }

    if (
      this.passwordRepromptService.protectedFields().includes(aType) &&
      !(await this.promptPassword())
    ) {
      return;
    }

    const copyOptions = this.win != null ? { window: this.win } : null;
    this.platformUtilsService.copyToClipboard(value, copyOptions);
    this.platformUtilsService.showToast(
      "info",
      null,
      this.i18nService.t("valueCopied", this.i18nService.t(typeI18nKey))
    );

    if (typeI18nKey === "password") {
      this.eventService.collect(EventType.Cipher_ClientToggledHiddenFieldVisible, this.cipherId);
    } else if (typeI18nKey === "securityCode") {
      this.eventService.collect(EventType.Cipher_ClientCopiedCardCode, this.cipherId);
    } else if (aType === "H_Field") {
      this.eventService.collect(EventType.Cipher_ClientCopiedHiddenField, this.cipherId);
    }
  }

  setTextDataOnDrag(event: DragEvent, data: string) {
    event.dataTransfer.setData("text", data);
  }

  async downloadAttachment(attachment: AttachmentView) {
    if (!(await this.promptPassword())) {
      return;
    }
    const a = attachment as any;
    if (a.downloading) {
      return;
    }

    if (this.cipher.organizationId == null && !this.canAccessPremium) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("premiumRequired"),
        this.i18nService.t("premiumRequiredDesc")
      );
      return;
    }

    let url: string;
    try {
      const attachmentDownloadResponse = await this.apiService.getAttachmentData(
        this.cipher.id,
        attachment.id
      );
      url = attachmentDownloadResponse.url;
    } catch (e) {
      if (e instanceof ErrorResponse && (e as ErrorResponse).statusCode === 404) {
        url = attachment.url;
      } else if (e instanceof ErrorResponse) {
        throw new Error((e as ErrorResponse).getSingleMessage());
      } else {
        throw e;
      }
    }

    a.downloading = true;
    const response = await fetch(new Request(url, { cache: "no-store" }));
    if (response.status !== 200) {
      this.platformUtilsService.showToast("error", null, this.i18nService.t("errorOccurred"));
      a.downloading = false;
      return;
    }

    try {
      const buf = await response.arrayBuffer();
      const key =
        attachment.key != null
          ? attachment.key
          : await this.cryptoService.getOrgKey(this.cipher.organizationId);
      const decBuf = await this.cryptoService.decryptFromBytes(buf, key);
      this.platformUtilsService.saveFile(this.win, decBuf, null, attachment.fileName);
    } catch (e) {
      this.platformUtilsService.showToast("error", null, this.i18nService.t("errorOccurred"));
    }

    a.downloading = false;
  }

  protected deleteCipher() {
    return this.cipher.isDeleted
      ? this.cipherService.deleteWithServer(this.cipher.id)
      : this.cipherService.softDeleteWithServer(this.cipher.id);
  }

  protected restoreCipher() {
    return this.cipherService.restoreWithServer(this.cipher.id);
  }

  protected async promptPassword() {
    if (this.cipher.reprompt === CipherRepromptType.None || this.passwordReprompted) {
      return true;
    }

    return (this.passwordReprompted = await this.passwordRepromptService.showPasswordPrompt());
  }

  private cleanUp() {
    this.totpCode = null;
    this.cipher = null;
    this.showPassword = false;
    this.showCardNumber = false;
    this.showCardCode = false;
    this.passwordReprompted = false;
    if (this.totpInterval) {
      clearInterval(this.totpInterval);
    }
  }

  private async totpUpdateCode() {
    if (
      this.cipher == null ||
      this.cipher.type !== CipherType.Login ||
      this.cipher.login.totp == null
    ) {
      if (this.totpInterval) {
        clearInterval(this.totpInterval);
      }
      return;
    }

    this.totpCode = await this.totpService.getCode(this.cipher.login.totp);
    if (this.totpCode != null) {
      if (this.totpCode.length > 4) {
        const half = Math.floor(this.totpCode.length / 2);
        this.totpCodeFormatted =
          this.totpCode.substring(0, half) + " " + this.totpCode.substring(half);
      } else {
        this.totpCodeFormatted = this.totpCode;
      }
    } else {
      this.totpCodeFormatted = null;
      if (this.totpInterval) {
        clearInterval(this.totpInterval);
      }
    }
  }

  private async totpTick(intervalSeconds: number) {
    const epoch = Math.round(new Date().getTime() / 1000.0);
    const mod = epoch % intervalSeconds;

    this.totpSec = intervalSeconds - mod;
    this.totpDash = +(Math.round(((78.6 / intervalSeconds) * mod + "e+2") as any) + "e-2");
    this.totpLow = this.totpSec <= 7;
    if (mod === 0) {
      await this.totpUpdateCode();
    }
  }
}
