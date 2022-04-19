import { Directive, EventEmitter, Input, Output } from "@angular/core";

import { CollectionService } from "jslib-common/abstractions/collection.service";
import { FolderService } from "jslib-common/abstractions/folder.service";
import { StateService } from "jslib-common/abstractions/state.service";
import { CipherType } from "jslib-common/enums/cipherType";
import { TreeNode } from "jslib-common/models/domain/treeNode";
import { CollectionView } from "jslib-common/models/view/collectionView";
import { FolderView } from "jslib-common/models/view/folderView";

@Directive()
export class GroupingsComponent {
  @Input() showFolders = true;
  @Input() showCollections = true;
  @Input() showFavorites = true;
  @Input() showTrash = true;

  @Output() onAllClicked = new EventEmitter();
  @Output() onFavoritesClicked = new EventEmitter();
  @Output() onTrashClicked = new EventEmitter();
  @Output() onCipherTypeClicked = new EventEmitter<CipherType>();
  @Output() onFolderClicked = new EventEmitter<FolderView>();
  @Output() onAddFolder = new EventEmitter();
  @Output() onEditFolder = new EventEmitter<FolderView>();
  @Output() onCollectionClicked = new EventEmitter<CollectionView>();

  folders: FolderView[];
  nestedFolders: TreeNode<FolderView>[];
  collections: CollectionView[];
  nestedCollections: TreeNode<CollectionView>[];
  loaded = false;
  cipherType = CipherType;
  selectedAll = false;
  selectedFavorites = false;
  selectedTrash = false;
  selectedType: CipherType = null;
  selectedFolder = false;
  selectedFolderId: string = null;
  selectedCollectionId: string = null;

  private collapsedGroupings: Set<string>;

  constructor(
    protected collectionService: CollectionService,
    protected folderService: FolderService,
    protected stateService: StateService
  ) {}

  async load(setLoaded = true) {
    const collapsedGroupings = await this.stateService.getCollapsedGroupings();
    if (collapsedGroupings == null) {
      this.collapsedGroupings = new Set<string>();
    } else {
      this.collapsedGroupings = new Set(collapsedGroupings);
    }

    await this.loadFolders();
    await this.loadCollections();

    if (setLoaded) {
      this.loaded = true;
    }
  }

  async loadCollections(organizationId?: string) {
    if (!this.showCollections) {
      return;
    }
    const collections = await this.collectionService.getAllDecrypted();
    if (organizationId != null) {
      this.collections = collections.filter((c) => c.organizationId === organizationId);
    } else {
      this.collections = collections;
    }
    this.nestedCollections = await this.collectionService.getAllNested(this.collections);
  }

  async loadFolders() {
    if (!this.showFolders) {
      return;
    }
    this.folders = await this.folderService.getAllDecrypted();
    this.nestedFolders = await this.folderService.getAllNested();
  }

  selectAll() {
    this.clearSelections();
    this.selectedAll = true;
    this.onAllClicked.emit();
  }

  selectFavorites() {
    this.clearSelections();
    this.selectedFavorites = true;
    this.onFavoritesClicked.emit();
  }

  selectTrash() {
    this.clearSelections();
    this.selectedTrash = true;
    this.onTrashClicked.emit();
  }

  selectType(type: CipherType) {
    this.clearSelections();
    this.selectedType = type;
    this.onCipherTypeClicked.emit(type);
  }

  selectFolder(folder: FolderView) {
    this.clearSelections();
    this.selectedFolder = true;
    this.selectedFolderId = folder.id;
    this.onFolderClicked.emit(folder);
  }

  addFolder() {
    this.onAddFolder.emit();
  }

  editFolder(folder: FolderView) {
    this.onEditFolder.emit(folder);
  }

  selectCollection(collection: CollectionView) {
    this.clearSelections();
    this.selectedCollectionId = collection.id;
    this.onCollectionClicked.emit(collection);
  }

  clearSelections() {
    this.selectedAll = false;
    this.selectedFavorites = false;
    this.selectedTrash = false;
    this.selectedType = null;
    this.selectedFolder = false;
    this.selectedFolderId = null;
    this.selectedCollectionId = null;
  }

  async collapse(grouping: FolderView | CollectionView, idPrefix = "") {
    if (grouping.id == null) {
      return;
    }
    const id = idPrefix + grouping.id;
    if (this.isCollapsed(grouping, idPrefix)) {
      this.collapsedGroupings.delete(id);
    } else {
      this.collapsedGroupings.add(id);
    }
    await this.stateService.setCollapsedGroupings(Array.from(this.collapsedGroupings));
  }

  isCollapsed(grouping: FolderView | CollectionView, idPrefix = "") {
    return this.collapsedGroupings.has(idPrefix + grouping.id);
  }
}
