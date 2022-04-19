import { Directive, EventEmitter, Input, OnInit, Output } from "@angular/core";

import { CipherService } from "jslib-common/abstractions/cipher.service";
import { CollectionService } from "jslib-common/abstractions/collection.service";
import { I18nService } from "jslib-common/abstractions/i18n.service";
import { LogService } from "jslib-common/abstractions/log.service";
import { PlatformUtilsService } from "jslib-common/abstractions/platformUtils.service";
import { Cipher } from "jslib-common/models/domain/cipher";
import { CipherView } from "jslib-common/models/view/cipherView";
import { CollectionView } from "jslib-common/models/view/collectionView";

@Directive()
export class CollectionsComponent implements OnInit {
  @Input() cipherId: string;
  @Input() allowSelectNone = false;
  @Output() onSavedCollections = new EventEmitter();

  formPromise: Promise<any>;
  cipher: CipherView;
  collectionIds: string[];
  collections: CollectionView[] = [];

  protected cipherDomain: Cipher;

  constructor(
    protected collectionService: CollectionService,
    protected platformUtilsService: PlatformUtilsService,
    protected i18nService: I18nService,
    protected cipherService: CipherService,
    private logService: LogService
  ) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.cipherDomain = await this.loadCipher();
    this.collectionIds = this.loadCipherCollections();
    this.cipher = await this.cipherDomain.decrypt();
    this.collections = await this.loadCollections();

    this.collections.forEach((c) => ((c as any).checked = false));
    if (this.collectionIds != null) {
      this.collections.forEach((c) => {
        (c as any).checked = this.collectionIds != null && this.collectionIds.indexOf(c.id) > -1;
      });
    }
  }

  async submit() {
    const selectedCollectionIds = this.collections
      .filter((c) => !!(c as any).checked)
      .map((c) => c.id);
    if (!this.allowSelectNone && selectedCollectionIds.length === 0) {
      this.platformUtilsService.showToast(
        "error",
        this.i18nService.t("errorOccurred"),
        this.i18nService.t("selectOneCollection")
      );
      return;
    }
    this.cipherDomain.collectionIds = selectedCollectionIds;
    try {
      this.formPromise = this.saveCollections();
      await this.formPromise;
      this.onSavedCollections.emit();
      this.platformUtilsService.showToast("success", null, this.i18nService.t("editedItem"));
    } catch (e) {
      this.logService.error(e);
    }
  }

  protected loadCipher() {
    return this.cipherService.get(this.cipherId);
  }

  protected loadCipherCollections() {
    return this.cipherDomain.collectionIds;
  }

  protected async loadCollections() {
    const allCollections = await this.collectionService.getAllDecrypted();
    return allCollections.filter(
      (c) => !c.readOnly && c.organizationId === this.cipher.organizationId
    );
  }

  protected saveCollections() {
    return this.cipherService.saveCollectionsWithServer(this.cipherDomain);
  }
}
