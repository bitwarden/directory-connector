import { FolderResponse } from "../response/folderResponse";

export class FolderData {
  id: string;
  userId: string;
  name: string;
  revisionDate: string;

  constructor(response: FolderResponse, userId: string) {
    this.userId = userId;
    this.name = response.name;
    this.id = response.id;
    this.revisionDate = response.revisionDate;
  }
}
