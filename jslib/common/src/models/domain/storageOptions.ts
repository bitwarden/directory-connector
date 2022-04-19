import { HtmlStorageLocation } from "../../enums/htmlStorageLocation";
import { StorageLocation } from "../../enums/storageLocation";

export type StorageOptions = {
  storageLocation?: StorageLocation;
  useSecureStorage?: boolean;
  userId?: string;
  htmlStorageLocation?: HtmlStorageLocation;
  keySuffix?: string;
};
