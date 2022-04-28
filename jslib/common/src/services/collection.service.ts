import { CollectionService as CollectionServiceAbstraction } from "../abstractions/collection.service";
import { CryptoService } from "../abstractions/crypto.service";
import { I18nService } from "../abstractions/i18n.service";
import { StateService } from "../abstractions/state.service";
import { ServiceUtils } from "../misc/serviceUtils";
import { Utils } from "../misc/utils";
import { CollectionData } from "../models/data/collectionData";
import { Collection } from "../models/domain/collection";
import { TreeNode } from "../models/domain/treeNode";
import { CollectionView } from "../models/view/collectionView";

const NestingDelimiter = "/";

export class CollectionService implements CollectionServiceAbstraction {
  constructor(
    private cryptoService: CryptoService,
    private i18nService: I18nService,
    private stateService: StateService
  ) {}

  async clearCache(userId?: string): Promise<void> {
    await this.stateService.setDecryptedCollections(null, { userId: userId });
  }

  async encrypt(model: CollectionView): Promise<Collection> {
    if (model.organizationId == null) {
      throw new Error("Collection has no organization id.");
    }
    const key = await this.cryptoService.getOrgKey(model.organizationId);
    if (key == null) {
      throw new Error("No key for this collection's organization.");
    }
    const collection = new Collection();
    collection.id = model.id;
    collection.organizationId = model.organizationId;
    collection.readOnly = model.readOnly;
    collection.name = await this.cryptoService.encrypt(model.name, key);
    return collection;
  }

  async decryptMany(collections: Collection[]): Promise<CollectionView[]> {
    if (collections == null) {
      return [];
    }
    const decCollections: CollectionView[] = [];
    const promises: Promise<any>[] = [];
    collections.forEach((collection) => {
      promises.push(collection.decrypt().then((c) => decCollections.push(c)));
    });
    await Promise.all(promises);
    return decCollections.sort(Utils.getSortFunction(this.i18nService, "name"));
  }

  async get(id: string): Promise<Collection> {
    const collections = await this.stateService.getEncryptedCollections();
    // eslint-disable-next-line
    if (collections == null || !collections.hasOwnProperty(id)) {
      return null;
    }

    return new Collection(collections[id]);
  }

  async getAll(): Promise<Collection[]> {
    const collections = await this.stateService.getEncryptedCollections();
    const response: Collection[] = [];
    for (const id in collections) {
      // eslint-disable-next-line
      if (collections.hasOwnProperty(id)) {
        response.push(new Collection(collections[id]));
      }
    }
    return response;
  }

  async getAllDecrypted(): Promise<CollectionView[]> {
    let decryptedCollections = await this.stateService.getDecryptedCollections();
    if (decryptedCollections != null) {
      return decryptedCollections;
    }

    const hasKey = await this.cryptoService.hasKey();
    if (!hasKey) {
      throw new Error("No key.");
    }

    const collections = await this.getAll();
    decryptedCollections = await this.decryptMany(collections);
    await this.stateService.setDecryptedCollections(decryptedCollections);
    return decryptedCollections;
  }

  async getAllNested(collections: CollectionView[] = null): Promise<TreeNode<CollectionView>[]> {
    if (collections == null) {
      collections = await this.getAllDecrypted();
    }
    const nodes: TreeNode<CollectionView>[] = [];
    collections.forEach((c) => {
      const collectionCopy = new CollectionView();
      collectionCopy.id = c.id;
      collectionCopy.organizationId = c.organizationId;
      const parts = c.name != null ? c.name.replace(/^\/+|\/+$/g, "").split(NestingDelimiter) : [];
      ServiceUtils.nestedTraverse(nodes, 0, parts, collectionCopy, null, NestingDelimiter);
    });
    return nodes;
  }

  async getNested(id: string): Promise<TreeNode<CollectionView>> {
    const collections = await this.getAllNested();
    return ServiceUtils.getTreeNodeObject(collections, id) as TreeNode<CollectionView>;
  }

  async upsert(collection: CollectionData | CollectionData[]): Promise<any> {
    let collections = await this.stateService.getEncryptedCollections();
    if (collections == null) {
      collections = {};
    }

    if (collection instanceof CollectionData) {
      const c = collection as CollectionData;
      collections[c.id] = c;
    } else {
      (collection as CollectionData[]).forEach((c) => {
        collections[c.id] = c;
      });
    }

    await this.replace(collections);
  }

  async replace(collections: { [id: string]: CollectionData }): Promise<any> {
    await this.clearCache();
    await this.stateService.setEncryptedCollections(collections);
  }

  async clear(userId?: string): Promise<any> {
    await this.clearCache(userId);
    await this.stateService.setEncryptedCollections(null, { userId: userId });
  }

  async delete(id: string | string[]): Promise<any> {
    const collections = await this.stateService.getEncryptedCollections();
    if (collections == null) {
      return;
    }

    if (typeof id === "string") {
      delete collections[id];
    } else {
      (id as string[]).forEach((i) => {
        delete collections[i];
      });
    }

    await this.replace(collections);
  }
}
