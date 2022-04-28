import { BaseResponse } from "../response/baseResponse";

export class PermissionsApi extends BaseResponse {
  accessEventLogs: boolean;
  accessImportExport: boolean;
  accessReports: boolean;
  /**
   * @deprecated Sep 29 2021: This permission has been split out to `createNewCollections`, `editAnyCollection`, and
   * `deleteAnyCollection`. It exists here for backwards compatibility with Server versions <= 1.43.0
   */
  manageAllCollections: boolean;
  createNewCollections: boolean;
  editAnyCollection: boolean;
  deleteAnyCollection: boolean;
  /**
   * @deprecated Sep 29 2021: This permission has been split out to `editAssignedCollections` and
   * `deleteAssignedCollections`. It exists here for backwards compatibility with Server versions <= 1.43.0
   */
  manageAssignedCollections: boolean;
  editAssignedCollections: boolean;
  deleteAssignedCollections: boolean;
  manageCiphers: boolean;
  manageGroups: boolean;
  manageSso: boolean;
  managePolicies: boolean;
  manageUsers: boolean;
  manageResetPassword: boolean;

  constructor(data: any = null) {
    super(data);
    if (data == null) {
      return this;
    }
    this.accessEventLogs = this.getResponseProperty("AccessEventLogs");
    this.accessImportExport = this.getResponseProperty("AccessImportExport");
    this.accessReports = this.getResponseProperty("AccessReports");

    // For backwards compatibility with Server <= 1.43.0
    this.manageAllCollections = this.getResponseProperty("ManageAllCollections");
    this.manageAssignedCollections = this.getResponseProperty("ManageAssignedCollections");

    this.createNewCollections = this.getResponseProperty("CreateNewCollections");
    this.editAnyCollection = this.getResponseProperty("EditAnyCollection");
    this.deleteAnyCollection = this.getResponseProperty("DeleteAnyCollection");
    this.editAssignedCollections = this.getResponseProperty("EditAssignedCollections");
    this.deleteAssignedCollections = this.getResponseProperty("DeleteAssignedCollections");

    this.manageCiphers = this.getResponseProperty("ManageCiphers");
    this.manageGroups = this.getResponseProperty("ManageGroups");
    this.manageSso = this.getResponseProperty("ManageSso");
    this.managePolicies = this.getResponseProperty("ManagePolicies");
    this.manageUsers = this.getResponseProperty("ManageUsers");
    this.manageResetPassword = this.getResponseProperty("ManageResetPassword");
  }
}
