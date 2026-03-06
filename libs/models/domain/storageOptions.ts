import { HtmlStorageLocation } from "@/libs/enums/htmlStorageLocation";
import { StorageLocation } from "@/libs/enums/storageLocation";

export type StorageOptions = {
  storageLocation?: StorageLocation;
  useSecureStorage?: boolean;
  userId?: string;
  htmlStorageLocation?: HtmlStorageLocation;
  keySuffix?: string;
};
