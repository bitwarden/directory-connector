export enum Permissions {
  AccessEventLogs,
  AccessImportExport,
  AccessReports,
  /**
   * @deprecated Sep 29 2021: This permission has been split out to `createNewCollections`, `editAnyCollection`, and
   * `deleteAnyCollection`. It exists here for backwards compatibility with Server versions <= 1.43.0
   */
  ManageAllCollections,
  /**
   * @deprecated Sep 29 2021: This permission has been split out to `editAssignedCollections` and
   * `deleteAssignedCollections`. It exists here for backwards compatibility with Server versions <= 1.43.0
   */
  ManageAssignedCollections,
  ManageGroups,
  ManageOrganization,
  ManagePolicies,
  ManageProvider,
  ManageUsers,
  ManageUsersPassword,
  CreateNewCollections,
  EditAnyCollection,
  DeleteAnyCollection,
  EditAssignedCollections,
  DeleteAssignedCollections,
  ManageSso,
}
