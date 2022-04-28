import { FolderData } from "../models/data/folderData";
import { Folder } from "../models/domain/folder";
import { SymmetricCryptoKey } from "../models/domain/symmetricCryptoKey";
import { TreeNode } from "../models/domain/treeNode";
import { FolderView } from "../models/view/folderView";

export abstract class FolderService {
  clearCache: (userId?: string) => Promise<void>;
  encrypt: (model: FolderView, key?: SymmetricCryptoKey) => Promise<Folder>;
  get: (id: string) => Promise<Folder>;
  getAll: () => Promise<Folder[]>;
  getAllDecrypted: () => Promise<FolderView[]>;
  getAllNested: () => Promise<TreeNode<FolderView>[]>;
  getNested: (id: string) => Promise<TreeNode<FolderView>>;
  saveWithServer: (folder: Folder) => Promise<any>;
  upsert: (folder: FolderData | FolderData[]) => Promise<any>;
  replace: (folders: { [id: string]: FolderData }) => Promise<any>;
  clear: (userId: string) => Promise<any>;
  delete: (id: string | string[]) => Promise<any>;
  deleteWithServer: (id: string) => Promise<any>;
}
