import { StorageOptions } from "../models/domain/storageOptions";

export abstract class StorageService {
  get: <T>(key: string, options?: StorageOptions) => Promise<T>;
  has: (key: string, options?: StorageOptions) => Promise<boolean>;
  save: (key: string, obj: any, options?: StorageOptions) => Promise<any>;
  remove: (key: string, options?: StorageOptions) => Promise<any>;
}
