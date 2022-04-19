import { Directive, EventEmitter, Input, OnInit, Output } from "@angular/core";

import { ApiService } from "jslib-common/abstractions/api.service";
import { CipherService } from "jslib-common/abstractions/cipher.service";
import { CryptoService } from "jslib-common/abstractions/crypto.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { LogService } from "jslib-common/abstractions/log.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { StateService } from "jslib-common/abstractions/state.service";
import { Cipher } from "jslib-common/models/domain/cipher";
import { ErrorResponse } from "jslib-common/models/response/errorResponse";
import { AttachmentView } from "jslib-common/models/view/attachmentView";
import { CipherView } from "jslib-common/models/view/cipherView";

@Directive()
export class AttachmentsComponent implements OnInit {
  @Input() cipherId: string;
  @Output() onUploadedAttachment = new EventEmitter();
  @Output() onDeletedAttachment = new EventEmitter();
  @Output() onReuploadedAttachment = new EventEmitter();

  cipher: CipherView;
  cipherDomain: Cipher;
  hasUpdatedKey: boolean;
  canAccessAttachments: boolean;
  formPromise: Promise<any>;
  deletePromises: { [id: string]: Promise<any> } = {};
  reuploadPromises: { [id: string]: Promise<any> } = {};
  emergencyAccessId?: string = null;

  constructor(
    protected cipherService: CipherService,
    protected i18nService: I18nService,
    protected cryptoService: CryptoService,
    protected platformUtilsService: PlatformUtilsService,
    protected apiService: ApiService,
    protected win: Window,
    protected logService: LogService,
    protected stateService: StateService
  ) {}

  async ngOnInit() {
    await this.init();
  }

  async submit() {
    if (!this.hasUpdatedKey) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("updateKey")
      );
      return;
    }

    const fileEl = document.getElementById("file") as HTMLInputElement;
    const files = fileEl.files;
    if (files == null || files.length === 0) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("selectFile")
      );
      return;
    }

    if (files[0].size > 524288000) {
      // 500 MB
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("maxFileSize")
      );
      return;
    }

    try {
      this.formPromise = this.saveCipherAttachment(files[0]);
      this.cipherDomain = await this.formPromise;
      this.cipher = await this.cipherDomain.decrypt();
      this.platformUtilsService.showToast("success", null, this.i18nService.t("attachmentSaved"));
      this.onUploadedAttachment.emit();
    } catch (e) {
      this.logService.error(e);
    }

    // reset file input
    // ref: https://stackoverflow.com/a/20552042
    fileEl.type = "";
    fileEl.type = "file";
    fileEl.value = "";
  }

  async delete(attachment: AttachmentView) {
    if (this.deletePromises[attachment.id] != null) {
      return;
    }

    const confirmed = await this.platformUtilsService.showDialog(
      this.i18nService.t("deleteAttachmentConfirmation"),
      this.i18nService.t("deleteAttachment"),
      this.i18nService.t("yes"),
      this.i18nService.t("no"),
      "warning"
    );
    if (!confirmed) {
      return;
    }

    try {
      this.deletePromises[attachment.id] = this.deleteCipherAttachment(attachment.id);
      await this.deletePromises[attachment.id];
      this.platformUtilsService.showToast("success", null, this.i18nService.t("deletedAttachment"));
      const i = this.cipher.attachments.indexOf(attachment);
      if (i > -1) {
        this.cipher.attachments.splice(i, 1);
      }
    } catch (e) {
      this.logService.error(e);
    }

    this.deletePromises[attachment.id] = null;
    this.onDeletedAttachment.emit();
  }

  async download(attachment: AttachmentView) {
    const a = attachment as any;
    if (a.downloading) {
      return;
    }

    if (!this.canAccessAttachments) {
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
        attachment.id,
        this.emergencyAccessId
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

  protected async init() {
    this.cipherDomain = await this.loadCipher();
    this.cipher = await this.cipherDomain.decrypt();

    this.hasUpdatedKey = await this.cryptoService.hasEncKey();
    const canAccessPremium = await this.stateService.getCanAccessPremium();
    this.canAccessAttachments = canAccessPremium || this.cipher.organizationId != null;

    if (!this.canAccessAttachments) {
      const confirmed = await this.platformUtilsService.showDialog(
        this.i18nService.t("premiumRequiredDesc"),
        this.i18nService.t("premiumRequired"),
        this.i18nService.t("learnMore"),
        this.i18nService.t("cancel")
      );
      if (confirmed) {
        this.platformUtilsService.launchUri("https://vault.bitwarden.com/#/?premium=purchase");
      }
    } else if (!this.hasUpdatedKey) {
      const confirmed = await this.platformUtilsService.showDialog(
        this.i18nService.t("updateKey"),
        this.i18nService.t("featureUnavailable"),
        this.i18nService.t("learnMore"),
        this.i18nService.t("cancel"),
        "warning"
      );
      if (confirmed) {
        this.platformUtilsService.launchUri(
          "https://bitwarden.com/help/account-encryption-key/#rotate-your-encryption-key"
        );
      }
    }
  }

  protected async reuploadCipherAttachment(attachment: AttachmentView, admin: boolean) {
    const a = attachment as any;
    if (attachment.key != null || a.downloading || this.reuploadPromises[attachment.id] != null) {
      return;
    }

    try {
      this.reuploadPromises[attachment.id] = Promise.resolve().then(async () => {
        // 1. Download
        a.downloading = true;
        const response = await fetch(new Request(attachment.url, { cache: "no-store" }));
        if (response.status !== 200) {
          this.platformUtilsService.showToast("error", null, this.i18nService.t("errorOccurred"));
          a.downloading = false;
          return;
        }

        try {
          // 2. Resave
          const buf = await response.arrayBuffer();
          const key =
            attachment.key != null
              ? attachment.key
              : await this.cryptoService.getOrgKey(this.cipher.organizationId);
          const decBuf = await this.cryptoService.decryptFromBytes(buf, key);
          this.cipherDomain = await this.cipherService.saveAttachmentRawWithServer(
            this.cipherDomain,
            attachment.fileName,
            decBuf,
            admin
          );
          this.cipher = await this.cipherDomain.decrypt();

          // 3. Delete old
          this.deletePromises[attachment.id] = this.deleteCipherAttachment(attachment.id);
          await this.deletePromises[attachment.id];
          const foundAttachment = this.cipher.attachments.filter((a2) => a2.id === attachment.id);
          if (foundAttachment.length > 0) {
            const i = this.cipher.attachments.indexOf(foundAttachment[0]);
            if (i > -1) {
              this.cipher.attachments.splice(i, 1);
            }
          }

          this.platformUtilsService.showToast(
            "success",
            null,
            this.i18nService.t("attachmentSaved")
          );
          this.onReuploadedAttachment.emit();
        } catch (e) {
          this.platformUtilsService.showToast("error", null, this.i18nService.t("errorOccurred"));
        }

        a.downloading = false;
      });
      await this.reuploadPromises[attachment.id];
    } catch (e) {
      this.logService.error(e);
    }
  }

  protected loadCipher() {
    return this.cipherService.get(this.cipherId);
  }

  protected saveCipherAttachment(file: File) {
    return this.cipherService.saveAttachmentWithServer(this.cipherDomain, file);
  }

  protected deleteCipherAttachment(attachmentId: string) {
    return this.cipherService.deleteAttachmentWithServer(this.cipher.id, attachmentId);
  }
}
